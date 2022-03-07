import ShortUniqueId from 'short-unique-id';
import { Edge, Navigable } from './Edge';
import Node, { NodeType } from './Node';

import _ from 'lodash';

type NodeMap<T> = {
    [key: string]: Node<T>;
};

type EdgeMatrix = {
    [key: string]: Edge[];
};

export interface NodeVisitor<T> {
    (node: Node<T>): boolean;
}

export default class Graph<T> {
    private id: string;

    private nodes: NodeMap<T>;
    private edgeMatrix: EdgeMatrix;

    private unityEdgeMatrices: EdgeMatrix[] = [];

    public constructor() {
        this.id = new ShortUniqueId({
            dictionary: 'hex', // the default
        })();

        this.nodes = {};
        this.edgeMatrix = {};
    }

    public addNode(node: Node<T>): void {
        this.nodes[node.id()] = node;
    }

    public addNodes(nodes: Node<T>[]): void {
        nodes.forEach((element) => {
            this.addNode(element);
        });
    }

    public link(fromNode: Node<T>, toNode: Node<T>, navigable: Navigable) {
        let em = this.edgeMatrix[fromNode.id()];
        if (!em) {
            em = [];
        }

        em.push(new Edge(fromNode.id(), toNode.id(), navigable));

        this.edgeMatrix[fromNode.id()] = em;

        fromNode.addOutgoing();
        toNode.addIncoming();
    }

    public visit(visitor: NodeVisitor<T>): void {
        const startNodes = Object.entries(this.nodes).filter((n) => {
            return n[1].type() === NodeType.START;
        });

        this.unityEdgeMatrices.forEach((uem) => {
            this._visit(startNodes[0][1], uem, visitor);
        });
    }

    private _visit(node: Node<T>, edgeMatrix: EdgeMatrix, visitor: NodeVisitor<T>) {
        const proceed = visitor(node);
        if (!proceed) {
            return;
        }
        // get the next bode to visit
        const edgeList = edgeMatrix[node.id()];
        if (!edgeList) {
            return;
        }
        const edge = edgeList[0];
        const nextNode = this.nodes[edge.to()];
        this._visit(nextNode, edgeMatrix, visitor);
    }

    public flatten() {
        const queue: EdgeMatrix[] = [this.edgeMatrix];
        while (queue.length > 0) {
            // console.log('processing next in queue');
            const em = queue.shift();
            const keys = Object.keys(em!);
            let abort = false;
            for (const key of keys) {
                if (abort) {
                    break;
                }
                // console.log(` ==> ${key}`);
                const edgeList = em![key];
                if (edgeList.length > 1) {
                    // console.log(` !!! ${key}`);
                    edgeList.forEach((element) => {
                        // console.log(element);
                        const newEm: EdgeMatrix = _.cloneDeep(em)!;
                        newEm[key] = [element];
                        // newEm[key][element[0]] = element[1];
                        queue.push(newEm);
                    });
                    abort = true;
                    // can abort and do next in queue
                }
            }
            if (!abort) {
                // console.log('Got final em');
                this.unityEdgeMatrices.push(em!);
            }
        }
    }

    public toString(): string {
        return `Graph[${this.id}]\n\tNodes::${this.nodeMapStr()}\n\tEdges::${this.edgeMatrixStr()}`;
    }

    public nodeMapStr(): string {
        return JSON.stringify(this.nodes);
    }

    public edgeMatrixStr(): string {
        return JSON.stringify(this.edgeMatrix);
    }
}
