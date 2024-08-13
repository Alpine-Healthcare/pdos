import { makeObservable, observable, reaction } from "mobx";
import { getEdgeInfo } from "./Model";
import { NetworkMapper } from "./NetworkMapper";
import { addToPdfs, getFromPdfs } from "./Pdfs";
export default class PDFSNode {
    core;
    _nodeType = "";
    _treePath = [];
    _treePathInclusive = [];
    _hash = "";
    _childrenRefreshMap = {};
    edges = {};
    _rawNode = {};
    _rawNodeUpdate = {};
    constructor(core, treePath, nodeType, hash) {
        this.core = core;
        this._treePath = treePath;
        this._hash = hash || "";
        this._nodeType = nodeType;
        makeObservable(this, {
            edges: observable,
            _rawNode: observable,
            _treePath: observable,
            _treePathInclusive: observable
        });
        /**
         * Any time the current nodes treePath is updated,
         * update all of its childrens
         */
        reaction(() => ({
            treePathInclusive: this._treePathInclusive
        }), ({ treePathInclusive }) => {
            Object.values(this.edges).forEach((edge) => {
                edge._treePath = treePathInclusive;
                edge._treePathInclusive = [...treePathInclusive, edge._hash];
            });
        });
    }
    onNodeLoad() { }
    get node() {
        return (async () => {
            if (this._hash) {
                this._rawNode = await getFromPdfs(this._hash, this._nodeType);
                this._nodeType = this._rawNode.type;
                this._treePathInclusive = [...this._treePath, this._hash];
                console.log("\n\n\n\nFetched existing node from pdfs");
                console.log("---------------------------------");
                console.log("Existing node from pdfs: ", this._nodeType);
                console.log("Raw node: ", this._rawNode);
                console.log("Node hash: ", this._hash);
                console.log("Node type: ", this._nodeType);
                console.log("Node tree path of : ", this._treePath);
            }
            else {
                const newNode = await addToPdfs(this._treePath, {
                    ...this._rawNode,
                    ...this._rawNodeUpdate
                }, this._nodeType);
                this._rawNode = newNode.rawNode;
                this._hash = newNode.hash;
                this._treePathInclusive = newNode.newTreePath;
                this._treePath = [...newNode.newTreePath].slice(0, -1);
                this._nodeType = newNode.rawNode.type;
                console.log("\n\n\n\nAdded node to pdfs");
                console.log("---------------------------------");
                console.log("Added node to pdfs: ", this._nodeType);
                console.log("Raw node: ", this._rawNode);
                console.log("Node hash: ", this._hash);
                console.log("Node type: ", this._nodeType);
                console.log("Node tree path of : ", this._treePath);
            }
            this.onNodeLoad();
        })();
    }
    setRawNodeUpdate(rawNode) {
        this._rawNodeUpdate = rawNode;
    }
    get refreshChildren() {
        console.log("\n\n\n\n\nRefreshing children");
        console.log("---------------------------------");
        console.log("Parent hash: ", this._hash);
        console.log("Parent type: ", this._nodeType);
        console.log("Parent rawnode: ", this._rawNode);
        if (this._rawNode["edges"] === undefined ||
            this._rawNode["edges"] === null ||
            Object.keys(this._rawNode["edges"]).length === 0) {
            console.log("No children");
            return;
        }
        const hasEdges = Object.values(this._rawNode.edges ?? {}).find(edge => edge !== null);
        if (!hasEdges) {
            console.log(`${this._hash} has uninitalized children`);
        }
        return (async () => {
            for (const [key, value] of Object.entries(this._rawNode.edges)) {
                const { coreType, instanceType } = getEdgeInfo(key);
                console.log("Child node type: ", coreType);
                if (!NetworkMapper[coreType]) {
                    console.log("Child node mapping not found continuing!");
                    continue;
                }
                let nodeName = "N_" + coreType;
                if (instanceType) {
                    nodeName += "_I";
                }
                let childEdge = "e_out_" + coreType;
                if (instanceType) {
                    childEdge += "_I";
                }
                const hashId = value?.child_hash_id ?? '';
                console.log("Child hash id: ", hashId);
                console.log("Child node name: ", nodeName);
                console.log("Parent child edge name: ", childEdge);
                const NodeClass = NetworkMapper[coreType];
                const currentTreePath = [...this._treePath, this._hash];
                const child = new NodeClass(this.core, currentTreePath, nodeName, hashId);
                await child.node;
                await child.refreshTree(this._treePathInclusive);
                this.edges[key] = child;
                console.log("Finished adding child node", Object.keys(this.edges));
                await child.refreshChildren;
            }
        })();
    }
    async refreshTree(previousTreePath) {
        await this.core.stores.userAccount.refresh(previousTreePath, this._treePathInclusive);
    }
    async update(rawNodeUpdate) {
        this._rawNodeUpdate = rawNodeUpdate;
        this._hash = "";
        const previousTreePath = [...this._treePathInclusive.slice(0, -1)];
        await this.node;
        await this.refreshTree(previousTreePath);
        this._rawNodeUpdate = {};
    }
    async addChild(ChildClass, instanceName, nodeUpdate, edgeUpdate) {
        /**
         * Create a new child node along with
         * initializing any of its children
         */
        console.log("tree path inclusive: ", this._treePathInclusive);
        const newChild = new ChildClass(this.core, this._treePathInclusive, instanceName, '');
        const edges = {};
        if (edgeUpdate) {
            Object.entries(edgeUpdate).forEach(([key, value]) => {
                edges[key] = {
                    child_hash_id: value
                };
            });
        }
        newChild.setRawNodeUpdate({
            ...nodeUpdate,
            edges
        });
        await newChild.node;
        /**
         * Does a full root node refresh that includes this parent
         */
        await newChild.refreshTree(this._treePathInclusive);
        /**
         * Loads this new child as an edge in the edges object map
         */
        let edgeName = `e_out_${ChildClass.name}`;
        if (instanceName) {
            edgeName += `_${instanceName}`;
        }
        this.edges[edgeName] = newChild;
        /**
         * Refreshes the children of the new child
         */
        await newChild.refreshChildren;
        return newChild;
    }
}
//# sourceMappingURL=PDFSNode.js.map