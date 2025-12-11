import type {
  ERDiagramAST,
  DiagramModel,
  DiagramNode,
  DiagramEdge,
  DiagramNodeType,
  EntityNode,
  AttributeNode,
  RelationshipNode,
} from '@shared/erd-types';

let nodeIdCounter = 0;
let edgeIdCounter = 0;

function generateNodeId(): string {
  return `node_${++nodeIdCounter}`;
}

function generateEdgeId(): string {
  return `edge_${++edgeIdCounter}`;
}

export function resetIdCounters(): void {
  nodeIdCounter = 0;
  edgeIdCounter = 0;
}

export function astToDiagramModel(ast: ERDiagramAST): DiagramModel {
  resetIdCounters();
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const entityNodeMap = new Map<string, string>();
  const relationNodeMap = new Map<string, string>();

  for (const entity of ast.entities) {
    const entityNodeId = generateNodeId();
    entityNodeMap.set(entity.name, entityNodeId);

    const entityNode: DiagramNode = {
      id: entityNodeId,
      type: entity.entityType === 'weak' ? 'weakEntity' : 'entity',
      label: entity.name,
      name: entity.name,
      entityType: entity.entityType,
      identifiedBy: entity.identifiedBy,
    };
    nodes.push(entityNode);

    for (const attr of entity.attributes) {
      processAttribute(attr, entityNodeId, nodes, edges);
    }
  }

  for (const rel of ast.relationships) {
    const relNodeId = generateNodeId();
    relationNodeMap.set(rel.name, relNodeId);

    const relNode: DiagramNode = {
      id: relNodeId,
      type: rel.relationshipType === 'identifying' ? 'identifyingRelationship' : 'relationship',
      label: rel.verb,
      name: rel.name,
      relationshipType: rel.relationshipType,
    };
    nodes.push(relNode);

    const leftEntityId = entityNodeMap.get(rel.leftSide.entityName);
    if (leftEntityId) {
      edges.push({
        id: generateEdgeId(),
        sourceId: leftEntityId,
        targetId: relNodeId,
        sourceCardinality: rel.leftSide.cardinality,
        sourceParticipation: rel.leftSide.participation,
      });
    }

    const rightEntityId = entityNodeMap.get(rel.rightSide.entityName);
    if (rightEntityId) {
      edges.push({
        id: generateEdgeId(),
        sourceId: relNodeId,
        targetId: rightEntityId,
        targetCardinality: rel.rightSide.cardinality,
        targetParticipation: rel.rightSide.participation,
      });
    }

    for (const attr of rel.attributes) {
      processAttribute(attr, relNodeId, nodes, edges);
    }
  }

  return { nodes, edges };
}

function processAttribute(
  attr: AttributeNode,
  parentId: string,
  nodes: DiagramNode[],
  edges: DiagramEdge[]
): void {
  const attrNodeId = generateNodeId();

  let type: DiagramNodeType = 'simpleAttribute';
  if (attr.attributeType === 'composite') {
    type = 'compositeAttribute';
  } else if (attr.attributeType === 'multivalued') {
    type = 'multivaluedAttribute';
  } else if (attr.attributeType === 'derived') {
    type = 'derivedAttribute';
  }

  const attrNode: DiagramNode = {
    id: attrNodeId,
    type,
    label: attr.name,
    parentId,
    isPrimaryKey: attr.keyType === 'pk',
    isForeignKey: attr.keyType === 'fk',
    fkTarget: attr.fkTarget,
    dataType: attr.dataType,
  };
  nodes.push(attrNode);

  edges.push({
    id: generateEdgeId(),
    sourceId: parentId,
    targetId: attrNodeId,
  });

  if (attr.attributeType === 'composite' && attr.subAttributes) {
    for (const subAttr of attr.subAttributes) {
      processAttribute(subAttr, attrNodeId, nodes, edges);
    }
  }
}

export function diagramModelToAST(model: DiagramModel): ERDiagramAST {
  const entities: EntityNode[] = [];
  const relationships: RelationshipNode[] = [];
  
  const nodeMap = new Map<string, DiagramNode>();
  for (const node of model.nodes) {
    nodeMap.set(node.id, node);
  }

  const childrenMap = new Map<string, DiagramNode[]>();
  for (const edge of model.edges) {
    if (!edge.sourceCardinality && !edge.targetCardinality) {
      const children = childrenMap.get(edge.sourceId) || [];
      const childNode = nodeMap.get(edge.targetId);
      if (childNode) {
        children.push(childNode);
        childrenMap.set(edge.sourceId, children);
      }
    }
  }

  for (const node of model.nodes) {
    if (node.type === 'entity' || node.type === 'weakEntity') {
      const attributes = getAttributesForNode(node.id, childrenMap, nodeMap);
      entities.push({
        name: node.label,
        entityType: node.entityType || (node.type === 'weakEntity' ? 'weak' : 'strong'),
        attributes,
        identifiedBy: node.identifiedBy,
      });
    }
  }

  for (const node of model.nodes) {
    if (node.type === 'relationship' || node.type === 'identifyingRelationship') {
      const relEdges = model.edges.filter(e => 
        (e.sourceId === node.id || e.targetId === node.id) && 
        (e.sourceCardinality || e.targetCardinality)
      );

      let leftSide = { entityName: '', cardinality: '1' as const, participation: 'partial' as const };
      let rightSide = { entityName: '', cardinality: 'M' as const, participation: 'partial' as const };

      for (const edge of relEdges) {
        if (edge.sourceId !== node.id) {
          const entityNode = nodeMap.get(edge.sourceId);
          if (entityNode) {
            leftSide = {
              entityName: entityNode.label,
              cardinality: edge.sourceCardinality || '1',
              participation: edge.sourceParticipation || 'partial',
            };
          }
        } else if (edge.targetId !== node.id) {
          const entityNode = nodeMap.get(edge.targetId);
          if (entityNode) {
            rightSide = {
              entityName: entityNode.label,
              cardinality: edge.targetCardinality || 'M',
              participation: edge.targetParticipation || 'partial',
            };
          }
        }
      }

      const attributes = getAttributesForNode(node.id, childrenMap, nodeMap);

      relationships.push({
        name: node.name || node.label,
        relationshipType: node.relationshipType || (node.type === 'identifyingRelationship' ? 'identifying' : 'normal'),
        leftSide,
        rightSide,
        verb: node.label,
        attributes,
      });
    }
  }

  return { entities, relationships };
}

function getAttributesForNode(
  nodeId: string,
  childrenMap: Map<string, DiagramNode[]>,
  nodeMap: Map<string, DiagramNode>
): AttributeNode[] {
  const children = childrenMap.get(nodeId) || [];
  const attributes: AttributeNode[] = [];

  for (const child of children) {
    if (child.type.includes('Attribute')) {
      const attr: AttributeNode = {
        name: child.label,
        attributeType: child.type === 'compositeAttribute' ? 'composite' :
                      child.type === 'multivaluedAttribute' ? 'multivalued' :
                      child.type === 'derivedAttribute' ? 'derived' : 'simple',
        keyType: child.isPrimaryKey ? 'pk' : child.isForeignKey ? 'fk' : 'none',
        fkTarget: child.fkTarget,
        dataType: child.dataType,
      };

      if (child.type === 'compositeAttribute') {
        attr.subAttributes = getAttributesForNode(child.id, childrenMap, nodeMap);
      }

      attributes.push(attr);
    }
  }

  return attributes;
}
