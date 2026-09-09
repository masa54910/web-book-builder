"use strict";

// WebBookMaker's managed page-flip fork keeps the upstream 2.0.7 renderer and
// adds an explicit physical right-bound adapter. The adapter is intentionally
// opt-in; horizontal/LTR callers continue to use the upstream methods.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pageFlip = require("./dist/js/page-flip.browser.js");

const FLIP_FORWARD = 0;
const FLIP_BACK = 1;
const STATE_READ = "read";
const LEFT_BOUND = "left-bound";
const RIGHT_BOUND = "right-bound";

function normalizeBindingMode(settings) {
  return settings && settings.bookBindingMode === RIGHT_BOUND ? RIGHT_BOUND : LEFT_BOUND;
}

function installRightBoundLayout(app) {
  const collection = app.getPageCollection();
  if (!collection || collection.__wbRightBoundLayoutInstalled) return;

  const render = app.getRender();
  collection.__wbRightBoundLayoutInstalled = true;
  const pageCount = collection.getPageCount();
  const rightBoundSpreads = pageCount
    ? [[0], ...Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => {
        const first = index + 1;
        return first + 1 < pageCount ? [first, first + 1] : [first];
      })]
    : [];
  collection.__wbRightBoundSpreads = rightBoundSpreads;
  collection.getSpread = function getRightBoundSpreads() {
    return this.__wbRightBoundSpreads;
  };
  collection.getSpreadIndexByPage = function getRightBoundSpreadIndex(pageIndex) {
    if (!Number.isInteger(pageIndex) || pageIndex < 0 || pageIndex >= pageCount) return null;
    return pageIndex;
  };

  // The upstream portrait renderer always places the current page on the
  // right. Right-bound books need an actual physical spread instead: the
  // canonical lower page index is on the right and the adjacent page is on
  // the left. This changes only the renderer's side assignment; page arrays
  // and page identities remain canonical.
  collection.showSpread = function showRightBoundSpread() {
    const spread = this.getSpread()[this.getCurrentSpreadIndex()];
    if (!spread) return;
    const pages = this.getPages();
    if (spread.length === 2) {
      render.setLeftPage(pages[spread[1]]);
      render.setRightPage(pages[spread[0]]);
    } else {
      // The closed front cover is a physical left page for right-bound
      // books. A trailing singleton uses the same safe single-page layout.
      render.setLeftPage(pages[spread[0]]);
      render.setRightPage(null);
    }
    this.currentPageIndex = spread[0];
    app.updatePageIndex(this.currentPageIndex);
  };
}

function installRightBoundMethods(app) {
  installRightBoundLayout(app);
  const controller = app.getFlipController();
  if (controller.flipRightBoundNext) return controller;

  const originalReset = controller.reset;
  const originalFlipNext = controller.flipNext;
  const originalFlipPrev = controller.flipPrev;

  const withPhysicalPages = (direction, physicalFlip, corner, flippingPage, bottomPage) => {
    if (controller.getState() !== STATE_READ) return;

    const collection = app.getPageCollection();
    const originalGetFlippingPage = collection.getFlippingPage;
    const originalGetBottomPage = collection.getBottomPage;
    const originalGetCurrentPageIndex = app.getCurrentPageIndex;
    const originalTurnNext = app.turnToNextPage;
    const originalTurnPrev = app.turnToPrevPage;

    // Keep the upstream clipping/rotation calculation, but provide the
    // physical sheet pair for a right-bound spread. The page that is visibly
    // on the left flips to the right for Next; the visible right page flips
    // back to the left for Previous.
    collection.getFlippingPage = () => flippingPage(collection);
    collection.getBottomPage = () => bottomPage(collection);
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
      // Reuse page-flip's tested corner/geometry primitive. Only map its
      // completion callback back to canonical page progression; never invent
      // a second coordinate system for the cover turn. Restore immediately
      // after the completion callback, not on a fixed short timer.
      if (direction === FLIP_BACK) {
        app.turnToPrevPage = function rightBoundNextCompletion() {
          const result = originalTurnNext.call(app);
          restore();
          return result;
        };
      } else {
        app.turnToNextPage = function rightBoundPreviousCompletion() {
          const result = originalTurnPrev.call(app);
          restore();
          return result;
        };
      }
      physicalFlip.call(controller, corner);

      // If an upstream animation is cancelled before its completion callback,
      // release the temporary hooks after the configured animation window.
      const flippingTime = Number(app.getSettings?.().flippingTime) || 1000;
      setTimeout(restore, flippingTime + 350);
    } catch {
      restore();
      originalReset.call(controller);
    }
  };

  controller.flipRightBoundNext = function (corner = "top") {
    withPhysicalPages(
      FLIP_BACK,
      originalFlipPrev,
      corner,
      (collection) => {
        const spread = collection.getSpread()[collection.getCurrentSpreadIndex()];
        const page = spread ? collection.getPage(spread.length === 2 ? spread[1] : spread[0]) : null;
        page?.setOrientation(0);
        return page;
      },
      (collection) => {
        const nextIndex = collection.getCurrentSpreadIndex() + 1;
        const next = collection.getSpread()[nextIndex];
        const pageIndex = next
          ? nextIndex === 1
            ? next[0]
            : (next[1] ?? next[0])
          : null;
        const page = pageIndex === null ? null : collection.getPage(pageIndex);
        page?.setOrientation(nextIndex === 1 ? 1 : 0);
        return page;
      },
    );
  };

  controller.flipRightBoundPrevious = function (corner = "top") {
    withPhysicalPages(
      FLIP_FORWARD,
      originalFlipNext,
      corner,
      (collection) => {
        const spread = collection.getSpread()[collection.getCurrentSpreadIndex()];
        const page = spread && spread.length === 2 ? collection.getPage(spread[0]) : null;
        page?.setOrientation(1);
        return page;
      },
      (collection) => {
        const previous = collection.getSpread()[collection.getCurrentSpreadIndex() - 1];
        const page = previous ? collection.getPage(previous[0]) : null;
        page?.setOrientation(collection.getCurrentSpreadIndex() - 1 === 0 ? 0 : 1);
        return page;
      },
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
const originalUpdateFromHTML = PageFlip.prototype.updateFromHtml;
const originalUpdateFromImages = PageFlip.prototype.updateFromImages;
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
  const result = originalLoadFromHTML.call(this, items);
  if (this.__wbPhysicalBinding === RIGHT_BOUND) {
    installRightBoundLayout(this);
    this.getPageCollection().show(this.getCurrentPageIndex());
  }
  return result;
};
PageFlip.prototype.loadFromImages = function (images) {
  initializeBindingMode(this);
  const result = originalLoadFromImages.call(this, images);
  if (this.__wbPhysicalBinding === RIGHT_BOUND) {
    installRightBoundLayout(this);
    this.getPageCollection().show(this.getCurrentPageIndex());
  }
  return result;
};
PageFlip.prototype.updateFromHtml = function (items) {
  const currentPageIndex = this.getCurrentPageIndex();
  const result = originalUpdateFromHTML.call(this, items);
  if (this.__wbPhysicalBinding === RIGHT_BOUND) {
    installRightBoundLayout(this);
    this.getPageCollection().show(currentPageIndex);
  }
  return result;
};
PageFlip.prototype.updateFromImages = function (images) {
  const currentPageIndex = this.getCurrentPageIndex();
  const result = originalUpdateFromImages.call(this, images);
  if (this.__wbPhysicalBinding === RIGHT_BOUND) {
    installRightBoundLayout(this);
    this.getPageCollection().show(currentPageIndex);
  }
  return result;
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
