import ShortUniqueId from 'short-unique-id';
import { Edge, Navigable } from './Edge';
import Node, { NodeType } from './Node';

import _ from 'lodash';
import { start } from 'repl';

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

    private appKeyIndex: NodeMap<T>;

    private unityEdgeMatrices: EdgeMatrix[] = [];

    public constructor() {
        this.id = new ShortUniqueId({
            dictionary: 'hex', // the default
        })();

        this.nodes = {};
        this.edgeMatrix = {};
        this.appKeyIndex = {};
    }

    /** Add a single node to the graph */
    public addNode(node: Node<T>): void {
        this.nodes[node.id()] = node;
        this.appKeyIndex[node.appKey()] = node;
    }

    /** Add an array of nodes to the graph. Order of the nodes in the array is irrelavent */
    public addNodes(nodes: Node<T>[]): void {
        nodes.forEach((element) => {
            this.addNode(element);
        });
    }

    /** Each node has a UUID, along with a application name (the 'appkey') for ease of debug
     * Returns the node matching the appkey
     */
    public getByAppKey(appKey: string): Node<T> {
        return this.appKeyIndex[appKey];
    }

    /** Gets the node based on it's uuid */
    public getById(id: string): Node<T> {
        return this.nodes[id];
    }

    /**
     * Returns the start node.
     * This graph requires there to be a single start node.
     */
    public getStartNode(): Node<T> {
        const startNodes: string[] = Object.keys(this.nodes).filter((m) => this.nodes[m].type() === NodeType.START);
        if (start.length === 0) {
            throw new Error('No start nodes located');
        } else if (start.length > 1) {
            throw new Error(`Found ${start.length} start nodes, must be 1`);
        }

        return this.getById(startNodes[0]);
    }

    /**
     * Adds a link between fromNode and toNode.
     * Setting the navigable qualities of the node
     */
    public link(fromNode: Node<T>, toNode: Node<T>, navigable: Navigable) {
        let em = this.edgeMatrix[fromNode.id()];
        if (!em) {
            em = [];
        }

        em.push(new Edge(fromNode.id(), toNode.id(), navigable));

        this.edgeMatrix[fromNode.id()] = em;

        // let the nodes keep a count of their incoming/outgoing edge cardinalities
        fromNode.addOutgoing();
        toNode.addIncoming();
    }

    /**
     * For each unityEdgeMatrix visit each node in order from the start to the end node
     * @param visitor Visitor function
     */
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
        // get the next node to visit
        const edgeList = edgeMatrix[node.id()];
        if (!edgeList) {
            return;
        }
        const edge = edgeList[0];
        const nextNode = this.nodes[edge.to()];
        this._visit(nextNode, edgeMatrix, visitor);
    }

    /**
     * Process all the edges to get a set of 'unit routes' through the graph from the
     * start node to (an) end node.
     *
     * Each node will be connected to a single other node. No branching and no loops.
     */
    public flattenToUnity() {
        const queue: EdgeMatrix[] = [this.edgeMatrix];
        // start with the first edge matrix
        // will process these in order, to achieve ones with single routes - start->end
        while (queue.length > 0) {
            const em = queue.shift();
            const keys = Object.keys(em!);

            // Get all the edges, and iterator over them
            // aborting earlier if needed
            let abort = false;
            for (const key of keys) {
                if (abort) {
                    break;
                }

                const edgeList = em![key];
                if (edgeList.length > 1) {
                    // got a set of edges

                    edgeList.forEach((element) => {
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
                this.unityEdgeMatrices.push(em!);
            }
        }

        // now that the theoretical unitEdgeMatrices have been created, we need to filter
        // these to avoid (a) duplication (b) ones with extra edges present (error in the above algorthm) (c) loops
        this.unityEdgeMatrices = _.uniqWith(
            this.unityEdgeMatrices
                .map((em) => this.checkEdgeMatrixCycle(em))
                .filter((em) => Object.keys(em).length > 0),
            _.isEqual,
        );
    }

    public toString(): string {
        return `Graph[${this.id}]
        Nodes::${this.nodeMapStr()}
        Edges::${this.edgeMatrixStr()}
        UnityEdges::${this.unityEdgeStr()}`;
    }

    private checkEdgeMatrixCycle(matrix: EdgeMatrix): EdgeMatrix {
        const seen: string[] = [];
        const returnMatrix: EdgeMatrix = {};
        let notDone = true;

        const startNode: string = Object.keys(matrix).filter((m) => this.nodes[m].type() === NodeType.START)[0];
        let e: Edge = matrix[startNode][0];

        while (notDone) {
            const nextNodeId = e.to();
            if (seen.includes(nextNodeId)) {
                // got a loop
                return {};
            }
            seen.push(nextNodeId);
            if (!returnMatrix[e.from()]) {
                returnMatrix[e.from()] = [];
            }
            returnMatrix[e.from()].push(e);
            if (this.nodes[nextNodeId].type() == NodeType.END) {
                notDone = false;
            }
            if (matrix[nextNodeId]) {
                e = matrix[nextNodeId][0];
            } else {
                notDone = false;
            }
        }

        return returnMatrix;
    }

    public nodeMapStr(): string {
        return JSON.stringify(this.nodes);
    }

    public edgeMatrixStr(): string {
        return JSON.stringify(this.edgeMatrix);
    }

    public unityEdgeStr(): string {
        return JSON.stringify(this.unityEdgeMatrices);
        // let op = '';
        // this.unityEdgeMatrices.forEach((e) => {
        //     Object.keys(e).forEach((i) => {
        //         const idFrom = e[i][0].from();
        //         const idTo = e[i][0].to();
        //         const str = `${this.nodes[idFrom].appKey()}=>>${this.nodes[idTo].appKey()}\n`;
        //         op += str;
        //     });
        //     op += '-------------------------------------------\n';
        // });

        // return op;
    }
}
