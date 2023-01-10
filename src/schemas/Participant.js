export default class Participant {
  constructor({ name, lastStatus }) {
    this.name = name;
    this.lastStatus = lastStatus ?? Date.now();
  }
}