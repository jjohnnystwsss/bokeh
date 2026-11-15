import {expect} from "#framework/assertions"
import {display} from "#framework/layouts"

import {Dialog} from "@bokehjs/models/ui/dialog"
import {bounding_box, MouseButton} from "@bokehjs/core/dom"
import * as dialogs from "@bokehjs/styles/dialogs.css"

describe("models/ui/dialog module", () => {
  describe("DialogView", () => {
    function pointer(type: string, x: number, y: number): PointerEvent {
      return new PointerEvent(type, {
        bubbles: true,
        composed: true,
        cancelable: true,
        isPrimary: true,
        pointerType: "mouse",
        pointerId: 1,
        buttons: type == "pointerdown" ? MouseButton.Left : 0,
        clientX: x,
        clientY: y,
      })
    }

    function escape(): void {
      document.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", bubbles: true, cancelable: true}))
    }

    async function new_dialog(attrs: Partial<Dialog.Attrs> = {}) {
      const dialog = Dialog.create({
        title: "A dialog",
        content: "Content",
        ...attrs,
      })
      const {view} = await display(dialog, null)

      const handle = (cls: string) => {
        const el = view.shadow_el.querySelector<HTMLElement>(`.${cls}`)
        expect(el).to.not.be.null
        return el!
      }

      const bbox = () => {
        const {left, top, width, height} = bounding_box(view.el)
        return {left, top, width, height}
      }

      return {view, handle, bbox}
    }

    function drag(el: HTMLElement, [x0, y0]: [number, number], [x1, y1]: [number, number], end: "up" | "escape" | "cancel" = "up"): void {
      el.dispatchEvent(pointer("pointerdown", x0, y0))
      el.dispatchEvent(pointer("pointermove", (x0 + x1)/2, (y0 + y1)/2))
      el.dispatchEvent(pointer("pointermove", x1, y1))
      switch (end) {
        case "up": {
          el.dispatchEvent(pointer("pointerup", x1, y1))
          break
        }
        case "escape": {
          escape()
          el.dispatchEvent(pointer("pointerup", x1, y1))
          break
        }
        case "cancel": {
          el.dispatchEvent(pointer("pointercancel", 0, 0))
          break
        }
      }
    }

    it("should support moving by the title", async () => {
      const {handle, bbox} = await new_dialog()
      const initial = bbox()

      drag(handle(dialogs.title), [100, 60], [130, 80])
      expect(bbox()).to.be.equal({...initial, left: initial.left + 30, top: initial.top + 20})
    })

    it("should support resizing by a corner", async () => {
      const {handle, bbox} = await new_dialog()
      const initial = bbox()

      drag(handle(dialogs.resize_bottom_right), [250, 200], [270, 230])
      expect(bbox()).to.be.equal({...initial, width: initial.width + 20, height: initial.height + 30})
    })

    it("should support movable == 'x'", async () => {
      const {handle, bbox} = await new_dialog({movable: "x"})
      const initial = bbox()

      drag(handle(dialogs.title), [100, 60], [130, 80])
      expect(bbox()).to.be.equal({...initial, left: initial.left + 30})
    })

    it("should not move when movable == 'none'", async () => {
      const {handle, bbox} = await new_dialog({movable: "none"})
      const initial = bbox()

      drag(handle(dialogs.title), [100, 60], [130, 80])
      expect(bbox()).to.be.equal(initial)
    })

    it("should restore the initial position when cancelled with Escape", async () => {
      const {view, handle, bbox} = await new_dialog()
      const initial = bbox()

      const title_el = handle(dialogs.title)
      title_el.dispatchEvent(pointer("pointerdown", 100, 60))
      title_el.dispatchEvent(pointer("pointermove", 130, 80))
      expect(bbox()).to.not.be.equal(initial)
      expect(view.el.classList.contains(dialogs.interacting)).to.be.true

      escape()
      expect(bbox()).to.be.equal(initial)
      expect(view.el.classList.contains(dialogs.interacting)).to.be.false

      // the rest of the gesture is ignored
      title_el.dispatchEvent(pointer("pointermove", 150, 90))
      title_el.dispatchEvent(pointer("pointerup", 150, 90))
      expect(bbox()).to.be.equal(initial)
    })

    it("should restore the initial position on pointercancel and allow further interaction", async () => {
      const {handle, bbox} = await new_dialog()
      const initial = bbox()

      drag(handle(dialogs.title), [100, 60], [130, 80], "cancel")
      expect(bbox()).to.be.equal(initial)

      drag(handle(dialogs.title), [100, 60], [110, 70])
      expect(bbox()).to.be.equal({...initial, left: initial.left + 10, top: initial.top + 10})
    })
  })
})
