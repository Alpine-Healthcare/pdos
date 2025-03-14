import { makeObservable, observable, reaction } from "mobx";
import pdos, { Core } from "../../Core";
import { getEdgeInfo } from "../Model";
import { findNodeInTree, NetworkMapper } from "../NetworkMapper";
import { addToPdfs, getFromPdfs } from "../../utils/Pdfs";
import { logger } from "../../utils/logger";
import PDOSStorageNode from "./PDOSStorageNode";

export default class PDOSNode {
  public _nodeType = "";

  public _hash: string = "";
  public _treePath: string[] = [];
  public _treePathInclusive: string[] = [];

  protected _childrenRefreshMap: { [key: string]: any } = {};
  public edges: { [key: string]: PDOSNode } = {};
  public edgeArray: PDOSNode[] = [];

  public _rawNode: any = {};
  public _rawNodeUpdate: any = {};

  constructor(
    protected core: Core,
    treePath: string[],
    nodeType: string,
    hash?: string,
  ) {
    this._treePath = treePath;
    this._hash = hash || "";
    this._nodeType = nodeType;

    makeObservable(this, {
      edges: observable,
      _rawNode: observable,
      _treePath: observable,
      _treePathInclusive: observable,
    });

    /**
     * Any time the current nodes treePath is updated,
     * update all of its childrens
     */
    reaction(
      () => ({
        treePathInclusive: this._treePathInclusive,
      }),
      ({ treePathInclusive }) => {
        Object.values(this.edges).forEach((edge: any) => {
          edge._treePath = treePathInclusive;
          edge._treePathInclusive = [...treePathInclusive, edge._hash];
        });
      },
    );
  }

  public getData() {
    return {
      hashId: this._hash,
      rawNode: this._rawNode,
    };
  }

  public getChildren() {
    return Object.values(this.edges);
  }

  protected onNodeLoad() {}

  public get node() {
    return (async () => {
      if (this._hash) {
        this._rawNode = await getFromPdfs(this._hash);
        if (this._nodeType.toLocaleLowerCase() === "treatment") {
          console.log("got new node._rawNode", this._rawNode);
        }
        if (this._rawNode.data) {
          try {
            this._rawNode.data =
              await this.core.modules.encryption?.decryptNode(
                this._rawNode.data,
              );
          } catch (e) {
            console.log("failed to decrypt");
          }
        }
        this._nodeType = this._rawNode.type;
        this._treePathInclusive = [...this._treePath, this._hash];

        logger.tree("\n\n\n\nFetched existing node from pdfs");
        logger.tree("---------------------------------");
        logger.tree("Existing node from pdfs: ", this._nodeType);
        logger.tree("Raw node: ", this._rawNode);
        logger.tree("Node hash: ", this._hash);
        logger.tree("Node type: ", this._nodeType);
        logger.tree("Node tree path of : ", this._treePath);
      } else {
        const newNode = await addToPdfs(
          this._treePath,
          {
            ...this._rawNode,
            ...this._rawNodeUpdate,
          },
          this._nodeType,
        );
        this._rawNode = newNode.rawNode;
        if (this._rawNode.data) {
          try {
            this._rawNode.data =
              await this.core.modules.encryption?.decryptNode(
                this._rawNode.data,
              );
          } catch (e) {
            console.log("failed to decrypt");
          }
        }
        this._hash = newNode.hash;
        this._treePathInclusive = newNode.newTreePath;
        this._treePath = [...newNode.newTreePath].slice(0, -1);
        this._nodeType = newNode.rawNode.type;

        logger.tree("\n\n\n\nAdded node to pdfs");
        logger.tree("---------------------------------");
        logger.tree("Added node to pdfs: ", this._nodeType);
        logger.tree("Raw node: ", this._rawNode);
        logger.tree("Node hash: ", this._hash);
        logger.tree("Node type: ", this._nodeType);
        logger.tree("Node tree path of : ", this._treePath);
      }

      this.onNodeLoad();
    })();
  }

  public setRawNodeUpdate(rawNode: any) {
    this._rawNodeUpdate = rawNode;
  }

  public get refreshChildren() {
    logger.tree("\n\n\n\n\nRefreshing children");
    logger.tree("---------------------------------");
    logger.tree("Parent hash: ", this._hash);
    logger.tree("Parent type: ", this._nodeType);
    logger.tree("Parent rawnode: ", this._rawNode);

    if (
      this._rawNode["edges"] === undefined ||
      this._rawNode["edges"] === null ||
      Object.keys(this._rawNode["edges"]).length === 0
    ) {
      logger.tree("No children");
      return;
    }

    const hasEdges = Object.values(this._rawNode.edges ?? {}).find(
      (edge) => edge !== null,
    );
    if (!hasEdges) {
      logger.tree(`${this._hash} has uninitalized children`);
    }

    return (async () => {
      for (const [key, value] of Object.entries(this._rawNode.edges) as any) {
        const { coreType, instanceType } = getEdgeInfo(key);

        logger.tree("Child node type: ", coreType);

        if (!(NetworkMapper as any)[coreType]) {
          logger.tree("Child node mapping not found continuing!");
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

        const hashId = value?.child_hash_id ?? "";

        logger.tree("Child hash id: ", hashId);
        logger.tree("Child node name: ", nodeName);
        logger.tree("Parent child edge name: ", childEdge);

        const NodeClass = (NetworkMapper as any)[coreType];
        const currentTreePath = [...this._treePath, this._hash];
        const child = new NodeClass(
          this.core,
          currentTreePath,
          nodeName,
          hashId,
        );
        await child.node;

        //TODO: unsure if this is needed
        await child.refreshTree(this._treePathInclusive);

        this.edges[key] = child;
        this.edgeArray.push(child);
        logger.tree("Finished adding child node", Object.keys(this.edges));

        await child.refreshChildren;
      }
    })();
  }

  public async refreshTree(previousTreePath: string[]) {
    await this.core.tree.root.refresh(
      previousTreePath,
      this._treePathInclusive,
    );
  }

  public async resync() {
    await this.update(this._rawNode.data);
  }

  public async update(
    rawNodeUpdate: object | null = null,
    unencrypted: boolean = false,
  ) {
    let nodeUpdate = {};

    if (unencrypted) {
      this._rawNodeUpdate = rawNodeUpdate;
    } else {
      if (!rawNodeUpdate) {
        rawNodeUpdate = {};
      }
      console.log("rawNodeUpdate", rawNodeUpdate);
      const encrypted =
        await pdos().modules.encryption?.encryptNode(rawNodeUpdate);
      console.log("encrypted", encrypted);
      nodeUpdate = {
        data: encrypted,
      };
      this._rawNodeUpdate = nodeUpdate;
    }

    this._hash = "";
    const previousTreePath = [...this._treePathInclusive.slice(0, -1)];
    await this.node;
    await this.refreshTree(previousTreePath);
    this._rawNodeUpdate = {};

    //await this.core.tree.root.push();
  }

  public async addChild(
    ChildClass: any,
    instanceName: string | undefined,
    nodeUpdate: any,
    edgeUpdate?: any,
  ) {
    /**
     * Create a new child node along with
     * initializing any of its children
     */
    logger.tree("tree path inclusive: ", this._treePathInclusive);

    const newChild = new ChildClass(
      this.core,
      this._treePathInclusive,
      instanceName,
      "",
    );
    const edges: any = {};

    if (edgeUpdate) {
      Object.entries(edgeUpdate).forEach(([key, value]) => {
        edges["e_out_" + key] = {
          type: "N_" + key,
          child_hash_id: value,
        };
      });
    }

    const encrypted = await pdos().modules.encryption?.encryptNode(nodeUpdate);

    const nodeUpdateEncrypted = {
      data: encrypted,
    };

    newChild.setRawNodeUpdate({
      ...nodeUpdateEncrypted,
      edges,
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
    this.edgeArray.push(newChild);

    /**
     * Refreshes the children of the new child
     */
    await newChild.refreshChildren;

    return newChild;
  }

  public async delete() {
    const parent = findNodeInTree("TreatmentManifest", this.core.tree.root);
    if (!parent) {
      throw new Error(`Parent node TreatmentManifest not found`);
    }

    console.log("deleting", this._nodeType);
    let keyToDelete = "";

    Object.entries(parent.edges).forEach(([key, edge]) => {
      if (edge._hash === this._hash) {
        keyToDelete = key;
      }
    });

    console.log("keyToDelete", keyToDelete);

    delete parent.edges[keyToDelete];
    delete parent._rawNode.edges[keyToDelete];
    const edgeIndex = parent.edgeArray.findIndex(
      (edge) => edge._hash === this._hash,
    );
    if (edgeIndex !== -1) {
      parent.edgeArray.splice(edgeIndex, 1);
    }
    console.log("parent", JSON.stringify(Object.keys(parent.edges)));
    await parent.resync();

    await this.core.tree.root.push();
  }

  private getStorageDate(date: Date) {
    return {
      year: date.getFullYear().toString(),
      month: date.getMonth().toString(),
      day: date.getDate().toString(),
    };
  }

  protected async addStorageChild(
    storageNode: any,
    childNode: any,
    instanceName: string | undefined,
    date: Date,
    data: any,
  ) {
    const storageDate = this.getStorageDate(date);

    const yearEdge = "e_out_PDOSStorageNode_" + storageDate.year;
    if (!this.edges[yearEdge]) {
      await this.addChild(storageNode, storageDate.year, {});
    }

    const monthEdge = "e_out_PDOSStorageNode_" + storageDate.month;
    if (!this.edges[yearEdge].edges[monthEdge]) {
      await this.edges[yearEdge].addChild(storageNode, storageDate.month, {});
    }

    const dayEdge = "e_out_PDOSStorageNode_" + storageDate.day;
    if (!this.edges[yearEdge].edges[monthEdge].edges[dayEdge]) {
      await this.edges[yearEdge].edges[monthEdge].addChild(
        storageNode,
        storageDate.day,
        {},
      );
    }

    await this.edges[yearEdge].edges[monthEdge].edges[dayEdge].addChild(
      childNode,
      instanceName,
      data,
    );
  }
}
