import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { exceedsDragThreshold } from '../js/ui/dragAndDrop.js';

describe('exceedsDragThreshold', () => {
  it('treats small motion as a tap', () => {
    assert.equal(exceedsDragThreshold(0, 0), false);
    assert.equal(exceedsDragThreshold(3, 4, 10), false);
  });

  it('treats larger motion as a drag', () => {
    assert.equal(exceedsDragThreshold(8, 8, 10), true);
  });
});
