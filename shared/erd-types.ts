export type AttributeType = 'simple' | 'composite' | 'multivalued' | 'derived' | 'typed';
export type KeyType = 'pk' | 'fk' | 'none';
export type Cardinality = '1' | 'M';
export type Participation = 'total' | 'partial';
export type EntityType = 'strong' | 'weak';
export type RelationshipType = 'normal' | 'identifying';

export interface ForeignKeyTarget {
  entityName: string;
  attributeName: string;
}

export interface AttributeNode {
  name: string;
  attributeType: AttributeType;
  keyType: KeyType;
  fkTarget?: ForeignKeyTarget;
  dataType?: string;
  subAttributes?: AttributeNode[];
}

export interface EntityNode {
  name: string;
  entityType: EntityType;
  attributes: AttributeNode[];
  identifiedBy?: ForeignKeyTarget[];
}

export interface RelationshipSide {
  entityName: string;
  cardinality: Cardinality;
  participation: Participation;
}

export interface RelationshipNode {
  name: string;
  relationshipType: RelationshipType;
  leftSide: RelationshipSide;
  rightSide: RelationshipSide;
  verb: string;
  attributes: AttributeNode[];
}

export interface ERDiagramAST {
  entities: EntityNode[];
  relationships: RelationshipNode[];
}

export type DiagramNodeType = 
  | 'entity' 
  | 'weakEntity' 
  | 'simpleAttribute' 
  | 'multivaluedAttribute' 
  | 'derivedAttribute' 
  | 'compositeAttribute'
  | 'relationship' 
  | 'identifyingRelationship';

export interface DiagramNode {
  id: string;
  type: DiagramNodeType;
  label: string;
  name?: string;
  parentId?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  fkTarget?: ForeignKeyTarget;
  dataType?: string;
  identifiedBy?: ForeignKeyTarget[];
  entityType?: EntityType;
  relationshipType?: RelationshipType;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface DiagramEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  sourceCardinality?: Cardinality;
  targetCardinality?: Cardinality;
  sourceParticipation?: Participation;
  targetParticipation?: Participation;
}

export interface DiagramModel {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export interface CanvasGraphics {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontFamily?: string;
  borderStyle?: 'single' | 'double' | 'dashed';
  isLocked?: boolean;
  fillColor?: string;
  strokeColor?: string;
}

export interface CanvasNode extends DiagramNode {
  graphics: CanvasGraphics;
}

export interface CanvasModel {
  nodes: CanvasNode[];
  edges: DiagramEdge[];
}
