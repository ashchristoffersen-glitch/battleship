/**
 * Represents a human player.
 */
export default class Player {
  /**
   * @param {string} name
   * @param {import('./Board.js').default} board
   */
  constructor(name, board) {
    this.name = name;
    this.board = board;
  }
}
