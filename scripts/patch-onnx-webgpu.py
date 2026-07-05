#!/usr/bin/env python3
"""Rewrite an ONNX graph so every WebGPU shader fits low storage-buffer limits.

Why: BiRefNet_lite's 1024px export contains giant Concat nodes (up to 1024
inputs) and Split nodes (32 outputs). onnxruntime's WebGPU EP turns each
input/output tensor into one storage-buffer binding, and macOS Metal exposes
only 10 bindings per shader stage — so the graph fails with
"Too many storage buffers in shader. Current: 11, Max is 10".

What it does:
  - Concat with > MAX_FANIN inputs   -> tree of Concats (<= MAX_FANIN inputs each)
  - Split  with > MAX_FANOUT outputs -> two-level Split tree (explicit sizes)

Concat/Split are pure data movement, so the rewrite is bit-exact — verified
against the original 1024 graph on a real photo (maxAbsDiff = 0 over 1.5M px).

Note: clearing the binding wall is necessary but NOT sufficient today. The
model's ScatterND/GatherND sampling ops still fall back to CPU WASM and blow
the 32-bit heap at 1024² (std::bad_alloc). Keep this script around for when
onnxruntime-web gains WebGPU kernels for those ops.

Usage:
  pip install onnx
  python3 scripts/patch-onnx-webgpu.py in/model_fp16.onnx out/model_fp16.onnx
"""
import sys
import uuid

import onnx
from onnx import helper, numpy_helper

MAX_FANIN = 8   # concat: 8 inputs + 1 output = 9 storage buffers
MAX_FANOUT = 8  # split: 1 input + 8 outputs = 9 storage buffers


def uniq(base):
    return f"{base}_{uuid.uuid4().hex[:6]}"


def get_axis(node, default=0):
    for a in node.attribute:
        if a.name == "axis":
            return a.i
    return default


def chunk(seq, n):
    return [seq[i : i + n] for i in range(0, len(seq), n)]


def main(src, dst):
    model = onnx.load(src)
    g = model.graph

    # value lookup for split-sizes constants (graph Constants + initializers)
    const_vals = {i.name: numpy_helper.to_array(i) for i in g.initializer}
    for n in g.node:
        if n.op_type == "Constant":
            for a in n.attribute:
                if a.name == "value":
                    const_vals[n.output[0]] = numpy_helper.to_array(a.t)

    def sizes_init(name, vals):
        t = helper.make_tensor(name, onnx.TensorProto.INT64, [len(vals)], vals)
        g.initializer.append(t)
        return name

    new_nodes = []
    n_concat = n_split = 0

    for node in g.node:
        if node.op_type == "Concat" and len(node.input) > MAX_FANIN:
            n_concat += 1
            axis = get_axis(node)
            level = list(node.input)
            rnd = 0
            while len(level) > MAX_FANIN:
                nxt = []
                for grp in chunk(level, MAX_FANIN):
                    if len(grp) == 1:
                        nxt.append(grp[0])
                        continue
                    out = uniq(f"{node.name}_t{rnd}")
                    new_nodes.append(
                        helper.make_node("Concat", inputs=list(grp),
                                         outputs=[out], name=out, axis=axis)
                    )
                    nxt.append(out)
                level = nxt
                rnd += 1
            new_nodes.append(
                helper.make_node("Concat", inputs=level,
                                 outputs=list(node.output),
                                 name=f"{node.name}_final", axis=axis)
            )
        elif node.op_type == "Split" and len(node.output) > MAX_FANOUT:
            axis = get_axis(node)
            sizes = None
            if len(node.input) > 1 and node.input[1] in const_vals:
                sizes = const_vals[node.input[1]].astype("int64").tolist()
            if sizes is None or len(sizes) != len(node.output):
                raise SystemExit(
                    f"cannot patch {node.name}: split sizes unknown ({sizes})"
                )
            n_split += 1
            out_groups = chunk(list(node.output), MAX_FANOUT)
            size_groups = chunk(sizes, MAX_FANOUT)

            # coarse split: one output per group, explicit per-group sums
            coarse_names = [uniq(f"{node.name}_g{i}") for i in range(len(out_groups))]
            coarse_sizes = sizes_init(uniq(f"{node.name}_gsz"),
                                      [sum(sg) for sg in size_groups])
            new_nodes.append(
                helper.make_node("Split", inputs=[node.input[0], coarse_sizes],
                                 outputs=coarse_names,
                                 name=uniq(f"{node.name}_coarse"), axis=axis)
            )
            # fine splits: original output names + exact chunk sizes
            for gname, grp, sg in zip(coarse_names, out_groups, size_groups):
                fine_sizes = sizes_init(uniq(f"{node.name}_fsz"), sg)
                new_nodes.append(
                    helper.make_node("Split", inputs=[gname, fine_sizes],
                                     outputs=list(grp),
                                     name=uniq(f"{node.name}_fine"), axis=axis)
                )
        else:
            new_nodes.append(node)

    del g.node[:]
    g.node.extend(new_nodes)

    onnx.checker.check_model(model)
    onnx.shape_inference.infer_shapes(model, strict_mode=True)
    onnx.save(model, dst)
    print(f"patched {n_concat} fat Concats and {n_split} fat Splits -> {dst}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2])
