/** Browser-only DOM evidence: loaded, visible images, excluding hidden button states. */
export async function visibleUiAssets(page) {
  return page.evaluate(() =>
    [...document.images]
      .filter((img) => {
        if (!img.complete || !img.naturalWidth || !img.getClientRects().length)
          return false;
        for (let el = img; el; el = el.parentElement) {
          const s = getComputedStyle(el);
          if (
            s.display === 'none' ||
            s.visibility === 'hidden' ||
            Number(s.opacity) === 0
          )
            return false;
        }
        const box = img.getBoundingClientRect();
        return (
          box.right > 0 &&
          box.bottom > 0 &&
          box.left < innerWidth &&
          box.top < innerHeight
        );
      })
      .map((img) => new URL(img.src).pathname.slice(1)),
  );
}
