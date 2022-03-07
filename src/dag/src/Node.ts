import ShortUniqueId from 'short-unique-id';

export enum NodeType {
    START = 'start',
    MID = 'mid',
    END = 'end',
}

export default class Node<T> {
    private data: T;
    private _id: string;

    private incoming = 0;
    private outgoing = 0;

    public constructor(data: T) {
        this.data = data;
        this._id = new ShortUniqueId({
            dictionary: 'hex', // the default
        })();
    }

    public getData() {
        return this.data;
    }

    public toString(): string {
        return `Node[${this._id}] /${this.type()}/`;
    }

    public id(): string {
        return this._id;
    }

    public addIncoming(): void {
        this.incoming++;
    }

    public addOutgoing(): void {
        this.outgoing++;
    }

    public type(): NodeType {
        if (this.incoming === 0) {
            return NodeType.START;
        } else if (this.outgoing === 0) {
            return NodeType.END;
        } else {
            return NodeType.MID;
        }
    }
}
