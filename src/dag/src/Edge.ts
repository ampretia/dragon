export enum Navigable {
    Navigable = 'NAVIGABLE',
    None = '-',
}

export class Edge {
    private fromId: string;
    private toId: string;
    private navigable: Navigable;

    public constructor(fromId: string, toId: string, navigable: Navigable) {
        this.fromId = fromId;
        this.toId = toId;
        this.navigable = navigable;
    }

    public from(): string {
        return this.fromId;
    }

    public to(): string {
        return this.toId;
    }

    public isNavigable(): boolean {
        return this.navigable === Navigable.Navigable;
    }

    public toString(): string {
        return `${this.fromId}==>${this.toId}`;
    }
}
