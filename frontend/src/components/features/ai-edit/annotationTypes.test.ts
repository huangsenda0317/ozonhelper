import {
  getPreviewAnchorTransform,
  normalizeAnnotationText,
} from "./annotationTypes";

describe("normalizeAnnotationText", () => {
  it("collapses newlines and extra whitespace to single line", () => {
    expect(normalizeAnnotationText("hello\nworld")).toBe("hello world");
    expect(normalizeAnnotationText("  a   b  ")).toBe("a b");
  });
});

describe("getPreviewAnchorTransform", () => {
  it("matches canvas textAlign anchor with textBaseline middle", () => {
    expect(getPreviewAnchorTransform("left")).toBe("translateY(-50%)");
    expect(getPreviewAnchorTransform("center")).toBe("translate(-50%, -50%)");
    expect(getPreviewAnchorTransform("right")).toBe("translate(-100%, -50%)");
  });
});
