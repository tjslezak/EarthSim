import * as p from "core/properties"
import {GestureEvent, UIEvent} from "core/ui_events"
import {keys} from "core/util/object"
import {isArray} from "core/util/types"
import {GlyphRenderer} from "models/renderers/glyph_renderer"
import {ColumnDataSource} from "models/sources/column_data_source"
import {PolyEditTool, PolyEditToolView} from "models/tools/edit/poly_edit_tool"


export class PolyVertexEditToolView extends PolyEditToolView {
  model: PolyVertexEditTool

  _pan(ev: GestureEvent): void {	
    if (this._basepoint == null)
      return
    const points = this._drag_points(ev, [this.model.vertex_renderer])
    if (ev.shiftKey) {
      this._move_linked(points)
    }
    if (this._selected_renderer)
      this._selected_renderer.data_source.change.emit()
  }

  _pan_end(ev: GestureEvent): void {
    if (this._basepoint == null)
      return
    const points = this._drag_points(ev, [this.model.vertex_renderer])
    if (ev.shiftKey) {
	  console.log(points)
      this._move_linked(points)
    }
    this._emit_cds_changes(this.model.vertex_renderer.data_source, false, true, true)
    if (this._selected_renderer) {
      this._emit_cds_changes(this._selected_renderer.data_source)
    }
    this._basepoint = null
  }

  _drag_points(ev: UIEvent, renderers: (GlyphRenderer & HasXYGlyph)[]): number[][] {
    if (this._basepoint == null)
      return []
    const [bx, by] = this._basepoint
    const points = [];
    for (const renderer of renderers) {
      const basepoint = this._map_drag(bx, by, renderer)
      const point = this._map_drag(ev.sx, ev.sy, renderer)
      if (point == null || basepoint == null) {
        continue
      }
      const [x, y] = point
      const [px, py] = basepoint
      const [dx, dy] = [x-px, y-py]
      // Type once dataspecs are typed
      const glyph: any = renderer.glyph
      const cds = renderer.data_source
      const [xkey, ykey] = [glyph.x.field, glyph.y.field]
      for (const index of cds.selected.indices) {
        const point = []
        if (xkey) {
          point.push(cds.data[xkey][index])
          cds.data[xkey][index] += dx
        }
        if (ykey) {
          point.push(cds.data[ykey][index])
          cds.data[ykey][index] += dy
        }
        point.push(dx)
        point.push(dy)
        points.push(point)
      }
      cds.change.emit()
    }
    this._basepoint = [ev.sx, ev.sy]
    return points
  }

  _set_vertices(xs: number[] | number, ys: number[] | number, styles): void {
    const point_glyph: any = this.model.vertex_renderer.glyph
    const point_cds = this.model.vertex_renderer.data_source
    const [pxkey, pykey] = [point_glyph.x.field, point_glyph.y.field]
    if (pxkey) {
      if (isArray(xs))
        point_cds.data[pxkey] = xs
      else
        point_glyph.x = {value: xs}
    }
    if (pykey) {
      if (isArray(ys))
        point_cds.data[pykey] = ys
      else
        point_glyph.y = {value: ys}
    }

    for (const key of keys(styles)) {
      point_cds.data[key] = styles[key] 
      point_glyph[key] = {field: key}
    }
    this._emit_cds_changes(point_cds, true, true, false)
  }

  _move_linked(points: number[][]): void {
    if (!this._selected_renderer)
      return
    const renderer = this._selected_renderer
    const glyph: any = renderer.glyph
    const cds: any = renderer.data_source
    const [xkey, ykey] = [glyph.xs.field, glyph.ys.field]
    const xpaths = cds.data[xkey]
    const ypaths = cds.data[ykey]
    for (const point of points) {
      const [x, y, dx, dy] = point
      for (let index = 0; index < xpaths.length; index++) {
        const xs = xpaths[index]
        const ys = ypaths[index]
        for (let i = 0; i < xs.length; i++) {
          if ((xs[i] == x) && (ys[i] == y)) {
            xs[i] += dx;
            ys[i] += dy;
          }
        }
      }
    }
  }

  _hide_vertices(): void {
    this._set_vertices([], [], {})
  }

  _show_vertices(ev: UIEvent): void {
    if (!this.model.active)
      return

    const renderers = this._select_event(ev, false, this.model.renderers)
    if (!renderers.length) {
      this._hide_vertices()
      this._selected_renderer = null
      this._drawing = false
      return
    }

    const renderer = renderers[0]
    const glyph: any = renderer.glyph
    const cds = renderer.data_source
    const index = cds.selected.indices[0]
    const [xkey, ykey] = [glyph.xs.field, glyph.ys.field]
    let xs: number[]
    let ys: number[]
    if (xkey) {
      xs = cds.data[xkey][index]
      if (!isArray(xs))
        cds.data[xkey][index] = xs = Array.from(xs)
    } else {
      xs = glyph.xs.value
    }

    if (ykey) {
      ys = cds.data[ykey][index]
      if (!isArray(ys))
        cds.data[ykey][index] = ys = Array.from(ys)
    } else {
      ys = glyph.ys.value
    }

    const styles = {}
    for (const key of keys(this.model.end_style))
      styles[key] = [this.model.end_style[key]]
    for (const key of keys(this.model.node_style)) {
      for (let index = 0; index < (xs.length-2); index++) { 
        styles[key].push(this.model.node_style[key])
      }
    }
    for (const key of keys(this.model.end_style))
      styles[key].push(this.model.end_style[key])
    this._selected_renderer = renderer
    this._set_vertices(xs, ys, styles)
  }
}

export namespace PolyVertexEditTool {
  export interface Attrs extends ActionTool.Attrs {}

  export interface Props extends ActionTool.Props {}
}

export interface PolyVertexEditTool extends PolyEditTool.Attrs {}

export class PolyVertexEditTool extends PolyEditTool {
  properties: PolyVertexEditTool.Props
  sources: ColumnDataSource[]

  constructor(attrs?: Partial<PolyVertexEditTool.Attrs>) {
    super(attrs)
  }

  static initClass(): void {
    this.prototype.type = "PolyVertexEditTool"
    this.prototype.default_view = PolyVertexEditToolView

    this.define({
      node_style: [ p.Any, {} ],
      end_style: [ p.Any, {} ],
    })
  }
}
PolyVertexEditTool.initClass()
