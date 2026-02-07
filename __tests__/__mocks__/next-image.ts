/**
 * Mock for next/image component used in NFT display components.
 * Renders a standard img element for testing purposes.
 */
import { vi } from 'vitest';

const MockImage = vi.fn().mockImplementation((props: Record<string, unknown>) => {
  // Return a mock element-like object for testing
  return {
    type: 'img',
    props: {
      src: props.src,
      alt: props.alt,
      width: props.width,
      height: props.height,
      ...props,
    },
  };
});

export default MockImage;
