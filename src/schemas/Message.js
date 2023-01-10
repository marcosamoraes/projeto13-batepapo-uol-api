import dayjs from "dayjs";

export default class Message {
  constructor(...props) {
    this.from = props[0].from;
    this.to = props[0].to ?? 'Todos';
    this.text = props[0].text;
    this.type = props[0].type ?? 'status';
    this.time = props[0].time ?? dayjs().format('HH:mm:ss');
  }
}