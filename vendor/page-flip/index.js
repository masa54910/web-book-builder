"use strict";

// WebBookMaker's managed page-flip fork keeps the upstream 2.0.7 renderer and
// adds an explicit physical right-bound adapter. The adapter is intentionally
// opt-in; horizontal/LTR callers continue to use the upstream methods.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pageFlip = require("./dist/js/page-flip.browser.js");

const FLIP_FORWARD = 0;
const FLIP_BACK = 1;
const STATE_FLIPPING = "flipping";
const STATE_READ = "read";
const LEFT_BOUND = "left-bound";
const RIGHT_BOUND = "right-bound";

function normalizeBindingMode(settings) {
  return settings && settings.bookBindingMode === RIGHT_BOUND ? RIGHT_BOUND : LEFT_BOUND;
}

function installRightBoundMethods(app) {
  const controller = app.getFlipController();
  if (controller.flipRightBoundNext) return controller;

  const originalStart = controller.start;
  const originalAnimate = controller.animateFlippingTo;
  const originalSetState = controller.setState;
  const originalReset = controller.reset;
  const originalGetBoundsRect = controller.getBoundsRect;
  const originalFlipNext = controller.flipNext;
  const originalFlipPrev = controller.flipPrev;

  const withPhysicalPages = (direction, pageMethod, bottomMethod, startPoint, destPoint) => {
    if (controller.getState() !== STATE_READ) return;

    const collection = app.getPageCollection();
    const originalGetFlippingPage = collection.getFlippingPage;
    const originalGetBottomPage = collection.getBottomPage;
    const originalGetCurrentPageIndex = app.getCurrentPageIndex;
    const originalTurnNext = app.turnToNextPage;
    const originalTurnPrev = app.turnToPrevPage;

    // Let the upstream calculation create its own clipping/rotation state,
    // while providing the physical sheet pair required by right-bound mode.
    collection.getFlippingPage = () => pageMethod(originalGetFlippingPage, collection);
    collection.getBottomPage = () => bottomMethod(originalGetBottomPage, collection, direction);
    if (direction === FLIP_BACK) {
      // Upstream rejects BACK at page zero. Physical right-bound Next is valid
      // there, so only relax this guard during the start calculation.
      app.getCurrentPageIndex = () => Math.max(1, originalGetCurrentPageIndex.call(app));
    }

    let restored = false;
    const restore = () => {
      if (restored) return;
      restored = true;
      collection.getFlippingPage = originalGetFlippingPage;
      collection.getBottomPage = originalGetBottomPage;
      app.getCurrentPageIndex = originalGetCurrentPageIndex;
      app.turnToNextPage = originalTurnNext;
      app.turnToPrevPage = originalTurnPrev;
    };

    try {
      if (!originalStart.call(controller, startPoint)) {
        restore();
        return;
      }

      // Flip.animateFlippingTo normally chooses the logical callback from its
      // direction. Keep its physical direction, but map completion back to
      // the canonical page progression without reversing page arrays.
      if (direction === FLIP_BACK) app.turnToPrevPage = originalTurnNext;
      else app.turnToNextPage = originalTurnPrev;

      originalSetState.call(controller, STATE_FLIPPING);
      controller.calc.calc(startPoint);
      originalAnimate.call(controller, startPoint, destPoint, true);

      // The upstream callback runs asynchronously and invokes the patched
      // turn method. Restore the collection hooks after that callback.
      setTimeout(restore, 900);
    } catch {
      restore();
      originalReset.call(controller);
    }
  };

  controller.flipRightBoundNext = function (corner = "top") {
    const rect = originalGetBoundsRect.call(controller);
    const margin = rect.height / 10;
    const y = corner === "bottom" ? rect.height - margin : margin;
    withPhysicalPages(
      FLIP_BACK,
      (getFlippingPage, collection) => getFlippingPage.call(collection, FLIP_FORWARD),
      (getBottomPage, collection) => getBottomPage.call(collection, FLIP_FORWARD),
      { x: -rect.pageWidth + margin, y },
      { x: rect.pageWidth, y: corner === "bottom" ? rect.height : 0 },
    );
  };

  controller.flipRightBoundPrevious = function (corner = "top") {
    const rect = originalGetBoundsRect.call(controller);
    const margin = rect.height / 10;
    const y = corner === "bottom" ? rect.height - margin : margin;
    withPhysicalPages(
      FLIP_FORWARD,
      (getFlippingPage, collection) => getFlippingPage.call(collection, FLIP_FORWARD),
      (getBottomPage, collection) => getBottomPage.call(collection, FLIP_BACK),
      { x: rect.pageWidth * 2 - margin, y },
      { x: -rect.pageWidth, y: corner === "bottom" ? rect.height : 0 },
    );
  };

  // Keep references explicit so a future upstream update can be audited.
  void originalFlipNext;
  void originalFlipPrev;
  return controller;
}

const PageFlip = pageFlip.PageFlip;
const originalLoadFromHTML = PageFlip.prototype.loadFromHTML;
const originalLoadFromImages = PageFlip.prototype.loadFromImages;
const originalGetFlipController = PageFlip.prototype.getFlipController;
const originalFlipNext = PageFlip.prototype.flipNext;
const originalFlipPrev = PageFlip.prototype.flipPrev;
const originalUserMove = PageFlip.prototype.userMove;
const originalUserStop = PageFlip.prototype.userStop;

function initializeBindingMode(instance) {
  // This runs before upstream loadFrom* calls pages.show(startPage), so the
  // first cover state and the first turn share the same explicit mode.
  instance.__wbPhysicalBinding = normalizeBindingMode(instance.getSettings?.());
}

PageFlip.prototype.loadFromHTML = function (items) {
  initializeBindingMode(this);
  return originalLoadFromHTML.call(this, items);
};
PageFlip.prototype.loadFromImages = function (images) {
  initializeBindingMode(this);
  return originalLoadFromImages.call(this, images);
};
PageFlip.prototype.getBookBindingMode = function () {
  return this.__wbPhysicalBinding || LEFT_BOUND;
};

PageFlip.prototype.setPhysicalBinding = function (binding) {
  this.__wbPhysicalBinding = binding === RIGHT_BOUND ? RIGHT_BOUND : LEFT_BOUND;
};
PageFlip.prototype.flipRightBoundNext = function (corner = "top") {
  installRightBoundMethods(this);
  return this.getFlipController().flipRightBoundNext(corner);
};
PageFlip.prototype.flipRightBoundPrevious = function (corner = "top") {
  installRightBoundMethods(this);
  return this.getFlipController().flipRightBoundPrevious(corner);
};
PageFlip.prototype.flipNext = function (corner = "top") {
  if (this.__wbPhysicalBinding === "right-bound") return this.flipRightBoundPrevious(corner);
  return originalFlipNext.call(this, corner);
};
PageFlip.prototype.flipPrev = function (corner = "top") {
  if (this.__wbPhysicalBinding === "right-bound") return this.flipRightBoundNext(corner);
  return originalFlipPrev.call(this, corner);
};
PageFlip.prototype.userMove = function (pos, isTouch) {
  if (this.__wbPhysicalBinding === "right-bound" && this.isUserTouch) {
    if (this.mousePosition && Math.hypot(this.mousePosition.x - pos.x, this.mousePosition.y - pos.y) > 5) {
      this.isUserMove = true;
    }
    return;
  }
  return originalUserMove.call(this, pos, isTouch);
};
PageFlip.prototype.userStop = function (pos, isSwipe = false) {
  if (this.__wbPhysicalBinding === "right-bound" && this.isUserTouch) {
    const dx = this.mousePosition ? pos.x - this.mousePosition.x : 0;
    this.isUserTouch = false;
    this.isUserMove = false;
    // Native UI.onTouchEnd already called the overridden flipPrev/flipNext
    // for a detected swipe, so do not issue a second turn here.
    if (isSwipe) return;
    if (Math.abs(dx) > 5) {
      return dx >= 0 ? this.flipRightBoundNext("top") : this.flipRightBoundPrevious("top");
    }
    const rect = this.getBoundsRect();
    return pos.x <= rect.width / 2
      ? this.flipRightBoundNext("top")
      : this.flipRightBoundPrevious("top");
  }
  return originalUserStop.call(this, pos, isSwipe);
};
PageFlip.prototype.getFlipController = function () {
  return originalGetFlipController.call(this);
};

module.exports = pageFlip;
