export type RectLike = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type PopoverViewport = {
  width: number;
  height: number;
};

export type PopoverLayout = {
  left: number;
  top: number;
  width?: number;
};

function clamp(value: number, min: number, max: number) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function computeInlineImagePopoverLayout(input: {
  anchorRect: RectLike;
  popoverRect: RectLike;
  viewport: PopoverViewport;
  mobileBreakpoint?: number;
  viewportPadding?: number;
  gap?: number;
  reservedBottom?: number;
}): PopoverLayout {
  const {
    anchorRect,
    popoverRect,
    viewport,
    mobileBreakpoint = 760,
    viewportPadding = 12,
    gap = 10,
    reservedBottom = 88,
  } = input;

  const maxBottom = Math.max(viewportPadding, viewport.height - reservedBottom - viewportPadding);
  const isMobile = viewport.width <= mobileBreakpoint;

  if (isMobile) {
    const width = Math.min(320, viewport.width - viewportPadding * 2);
    const effectiveWidth = Math.min(width, popoverRect.width || width);
    const effectiveHeight = popoverRect.height;

    let left = anchorRect.left + anchorRect.width / 2 - effectiveWidth / 2;
    left = clamp(left, viewportPadding, viewport.width - viewportPadding - effectiveWidth);

    let top = anchorRect.bottom + gap;
    if (top + effectiveHeight > maxBottom) {
      top = anchorRect.top - effectiveHeight - gap;
    }
    top = clamp(top, viewportPadding, Math.max(viewportPadding, maxBottom - effectiveHeight));

    return { left, top, width };
  }

  const effectiveWidth = popoverRect.width;
  const effectiveHeight = popoverRect.height;

  let left = anchorRect.right + gap;
  if (left + effectiveWidth > viewport.width - viewportPadding) {
    left = anchorRect.left - effectiveWidth - gap;
  }
  left = clamp(left, viewportPadding, viewport.width - viewportPadding - effectiveWidth);

  let top = anchorRect.top;
  if (top + effectiveHeight > maxBottom) {
    top = anchorRect.bottom - effectiveHeight;
  }
  top = clamp(top, viewportPadding, Math.max(viewportPadding, maxBottom - effectiveHeight));

  return { left, top };
}
