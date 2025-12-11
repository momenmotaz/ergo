import type { DiagramModel, DiagramNode, DiagramEdge, CanvasModel, CanvasNode } from '@shared/erd-types';

declare global {
  interface Window {
    mxGraph: any;
    mxClient: any;
    mxUtils: any;
    mxEvent: any;
    mxRubberband: any;
    mxConstants: any;
    mxEdgeStyle: any;
    mxPerimeter: any;
    mxStylesheet: any;
    mxUndoManager: any;
    mxKeyHandler: any;
    mxSvgCanvas2D: any;
    mxImageExport: any;
    mxXmlRequest: any;
  }
}

export type GraphChangeListener = (model: DiagramModel) => void;

export interface MxGraphEditor {
  graph: any;
  undoManager: any;
  container: HTMLElement;
  cellNodeMap: Map<string, any>;
  nodeCellMap: Map<any, string>;
  originalModel: DiagramModel | null;
  onModelChange: GraphChangeListener | null;
}

const ENTITY_WIDTH = 140;
const ENTITY_HEIGHT = 40;
const ATTRIBUTE_WIDTH = 100;
const ATTRIBUTE_HEIGHT = 30;
const RELATIONSHIP_WIDTH = 100;
const RELATIONSHIP_HEIGHT = 60;
const HORIZONTAL_SPACING = 200;
const VERTICAL_SPACING = 100;
const ATTRIBUTE_SPACING = 50;

export function initMxGraph(container: HTMLElement): MxGraphEditor {
  const mx = window;
  
  if (!mx.mxClient) {
    throw new Error('mxClient is not available. The mxGraph library may not have loaded correctly.');
  }
  
  if (!mx.mxClient.isBrowserSupported()) {
    throw new Error('This browser is not supported by mxGraph.');
  }

  const graph = new mx.mxGraph(container);

  graph.setConnectable(false);
  graph.setAllowDanglingEdges(false);
  graph.setDisconnectOnMove(false);
  graph.setCellsResizable(true);
  graph.setCellsMovable(true);
  graph.setCellsEditable(true);
  graph.setCellsDeletable(false);
  graph.setDropEnabled(false);
  graph.setPanning(true);
  graph.panningHandler.useLeftButtonForPanning = true;

  new mx.mxRubberband(graph);

  const undoManager = new mx.mxUndoManager();
  const listener = function(sender: any, evt: any) {
    undoManager.undoableEditHappened(evt.getProperty('edit'));
  };
  graph.getModel().addListener(mx.mxEvent.UNDO, listener);
  graph.getView().addListener(mx.mxEvent.UNDO, listener);

  const keyHandler = new mx.mxKeyHandler(graph);
  keyHandler.bindKey(90, function() { 
    undoManager.undo();
  });
  keyHandler.bindKey(89, function() { 
    undoManager.redo();
  });

  setupStyles(graph);

  graph.setHtmlLabels(true);

  const editor: MxGraphEditor = {
    graph,
    undoManager,
    container,
    cellNodeMap: new Map(),
    nodeCellMap: new Map(),
    originalModel: null,
    onModelChange: null,
  };

  graph.getModel().addListener(mx.mxEvent.CHANGE, () => {
    if (editor.onModelChange && editor.originalModel) {
      const updatedModel = extractModelFromGraph(editor);
      editor.onModelChange(updatedModel);
    }
  });

  return editor;
}

function setupStyles(graph: any): void {
  const mx = window;
  const mxConstants = mx.mxConstants;
  const mxEdgeStyle = mx.mxEdgeStyle;
  const mxPerimeter = mx.mxPerimeter;

  const style = graph.getStylesheet().getDefaultVertexStyle();
  style[mxConstants.STYLE_FONTFAMILY] = 'Inter, sans-serif';
  style[mxConstants.STYLE_FONTSIZE] = 13;
  style[mxConstants.STYLE_FONTSTYLE] = 0;
  style[mxConstants.STYLE_FILLCOLOR] = '#ffffff';
  style[mxConstants.STYLE_STROKECOLOR] = '#374151';
  style[mxConstants.STYLE_STROKEWIDTH] = 2;

  const edgeStyle = graph.getStylesheet().getDefaultEdgeStyle();
  edgeStyle[mxConstants.STYLE_STROKECOLOR] = '#6b7280';
  edgeStyle[mxConstants.STYLE_STROKEWIDTH] = 1.5;
  edgeStyle[mxConstants.STYLE_EDGE] = mxEdgeStyle.OrthConnector;
  edgeStyle[mxConstants.STYLE_ROUNDED] = true;
  edgeStyle[mxConstants.STYLE_FONTSIZE] = 11;
  edgeStyle[mxConstants.STYLE_FONTCOLOR] = '#374151';

  graph.getStylesheet().putCellStyle('entity', {
    [mxConstants.STYLE_SHAPE]: mxConstants.SHAPE_RECTANGLE,
    [mxConstants.STYLE_PERIMETER]: mxPerimeter.RectanglePerimeter,
    [mxConstants.STYLE_FILLCOLOR]: '#ffffff',
    [mxConstants.STYLE_STROKECOLOR]: '#1e3a5f',
    [mxConstants.STYLE_STROKEWIDTH]: 2,
    [mxConstants.STYLE_ROUNDED]: false,
    [mxConstants.STYLE_FONTSIZE]: 14,
    [mxConstants.STYLE_FONTCOLOR]: '#111827',
    [mxConstants.STYLE_FONTSTYLE]: mxConstants.FONT_BOLD,
    [mxConstants.STYLE_VERTICAL_ALIGN]: mxConstants.ALIGN_MIDDLE,
    [mxConstants.STYLE_ALIGN]: mxConstants.ALIGN_CENTER,
  });

  graph.getStylesheet().putCellStyle('weakEntity', {
    [mxConstants.STYLE_SHAPE]: mxConstants.SHAPE_RECTANGLE,
    [mxConstants.STYLE_PERIMETER]: mxPerimeter.RectanglePerimeter,
    [mxConstants.STYLE_FILLCOLOR]: '#ffffff',
    [mxConstants.STYLE_STROKECOLOR]: '#1e3a5f',
    [mxConstants.STYLE_STROKEWIDTH]: 4,
    [mxConstants.STYLE_ROUNDED]: false,
    [mxConstants.STYLE_FONTSIZE]: 14,
    [mxConstants.STYLE_FONTCOLOR]: '#111827',
    [mxConstants.STYLE_FONTSTYLE]: mxConstants.FONT_BOLD,
    [mxConstants.STYLE_VERTICAL_ALIGN]: mxConstants.ALIGN_MIDDLE,
    [mxConstants.STYLE_ALIGN]: mxConstants.ALIGN_CENTER,
  });

  graph.getStylesheet().putCellStyle('simpleAttribute', {
    [mxConstants.STYLE_SHAPE]: mxConstants.SHAPE_ELLIPSE,
    [mxConstants.STYLE_PERIMETER]: mxPerimeter.EllipsePerimeter,
    [mxConstants.STYLE_FILLCOLOR]: '#f8fafc',
    [mxConstants.STYLE_STROKECOLOR]: '#64748b',
    [mxConstants.STYLE_STROKEWIDTH]: 1.5,
    [mxConstants.STYLE_FONTSIZE]: 12,
    [mxConstants.STYLE_FONTCOLOR]: '#334155',
    [mxConstants.STYLE_VERTICAL_ALIGN]: mxConstants.ALIGN_MIDDLE,
    [mxConstants.STYLE_ALIGN]: mxConstants.ALIGN_CENTER,
  });

  graph.getStylesheet().putCellStyle('pkAttribute', {
    [mxConstants.STYLE_SHAPE]: mxConstants.SHAPE_ELLIPSE,
    [mxConstants.STYLE_PERIMETER]: mxPerimeter.EllipsePerimeter,
    [mxConstants.STYLE_FILLCOLOR]: '#fef3c7',
    [mxConstants.STYLE_STROKECOLOR]: '#d97706',
    [mxConstants.STYLE_STROKEWIDTH]: 2,
    [mxConstants.STYLE_FONTSIZE]: 12,
    [mxConstants.STYLE_FONTCOLOR]: '#92400e',
    [mxConstants.STYLE_FONTSTYLE]: mxConstants.FONT_UNDERLINE,
    [mxConstants.STYLE_VERTICAL_ALIGN]: mxConstants.ALIGN_MIDDLE,
    [mxConstants.STYLE_ALIGN]: mxConstants.ALIGN_CENTER,
  });

  graph.getStylesheet().putCellStyle('fkAttribute', {
    [mxConstants.STYLE_SHAPE]: mxConstants.SHAPE_ELLIPSE,
    [mxConstants.STYLE_PERIMETER]: mxPerimeter.EllipsePerimeter,
    [mxConstants.STYLE_FILLCOLOR]: '#dbeafe',
    [mxConstants.STYLE_STROKECOLOR]: '#2563eb',
    [mxConstants.STYLE_STROKEWIDTH]: 1.5,
    [mxConstants.STYLE_FONTSIZE]: 12,
    [mxConstants.STYLE_FONTCOLOR]: '#1d4ed8',
    [mxConstants.STYLE_FONTSTYLE]: mxConstants.FONT_ITALIC,
    [mxConstants.STYLE_VERTICAL_ALIGN]: mxConstants.ALIGN_MIDDLE,
    [mxConstants.STYLE_ALIGN]: mxConstants.ALIGN_CENTER,
  });

  graph.getStylesheet().putCellStyle('multivaluedAttribute', {
    [mxConstants.STYLE_SHAPE]: mxConstants.SHAPE_ELLIPSE,
    [mxConstants.STYLE_PERIMETER]: mxPerimeter.EllipsePerimeter,
    [mxConstants.STYLE_FILLCOLOR]: '#f8fafc',
    [mxConstants.STYLE_STROKECOLOR]: '#64748b',
    [mxConstants.STYLE_STROKEWIDTH]: 3,
    [mxConstants.STYLE_FONTSIZE]: 12,
    [mxConstants.STYLE_FONTCOLOR]: '#334155',
    [mxConstants.STYLE_VERTICAL_ALIGN]: mxConstants.ALIGN_MIDDLE,
    [mxConstants.STYLE_ALIGN]: mxConstants.ALIGN_CENTER,
  });

  graph.getStylesheet().putCellStyle('derivedAttribute', {
    [mxConstants.STYLE_SHAPE]: mxConstants.SHAPE_ELLIPSE,
    [mxConstants.STYLE_PERIMETER]: mxPerimeter.EllipsePerimeter,
    [mxConstants.STYLE_FILLCOLOR]: '#f8fafc',
    [mxConstants.STYLE_STROKECOLOR]: '#64748b',
    [mxConstants.STYLE_STROKEWIDTH]: 1.5,
    [mxConstants.STYLE_DASHED]: true,
    [mxConstants.STYLE_FONTSIZE]: 12,
    [mxConstants.STYLE_FONTCOLOR]: '#334155',
    [mxConstants.STYLE_VERTICAL_ALIGN]: mxConstants.ALIGN_MIDDLE,
    [mxConstants.STYLE_ALIGN]: mxConstants.ALIGN_CENTER,
  });

  graph.getStylesheet().putCellStyle('compositeAttribute', {
    [mxConstants.STYLE_SHAPE]: mxConstants.SHAPE_ELLIPSE,
    [mxConstants.STYLE_PERIMETER]: mxPerimeter.EllipsePerimeter,
    [mxConstants.STYLE_FILLCOLOR]: '#e0e7ff',
    [mxConstants.STYLE_STROKECOLOR]: '#4f46e5',
    [mxConstants.STYLE_STROKEWIDTH]: 1.5,
    [mxConstants.STYLE_FONTSIZE]: 12,
    [mxConstants.STYLE_FONTCOLOR]: '#3730a3',
    [mxConstants.STYLE_VERTICAL_ALIGN]: mxConstants.ALIGN_MIDDLE,
    [mxConstants.STYLE_ALIGN]: mxConstants.ALIGN_CENTER,
  });

  graph.getStylesheet().putCellStyle('relationship', {
    [mxConstants.STYLE_SHAPE]: mxConstants.SHAPE_RHOMBUS,
    [mxConstants.STYLE_PERIMETER]: mxPerimeter.RhombusPerimeter,
    [mxConstants.STYLE_FILLCOLOR]: '#dcfce7',
    [mxConstants.STYLE_STROKECOLOR]: '#16a34a',
    [mxConstants.STYLE_STROKEWIDTH]: 2,
    [mxConstants.STYLE_FONTSIZE]: 12,
    [mxConstants.STYLE_FONTCOLOR]: '#166534',
    [mxConstants.STYLE_FONTSTYLE]: mxConstants.FONT_ITALIC,
    [mxConstants.STYLE_VERTICAL_ALIGN]: mxConstants.ALIGN_MIDDLE,
    [mxConstants.STYLE_ALIGN]: mxConstants.ALIGN_CENTER,
  });

  graph.getStylesheet().putCellStyle('identifyingRelationship', {
    [mxConstants.STYLE_SHAPE]: mxConstants.SHAPE_RHOMBUS,
    [mxConstants.STYLE_PERIMETER]: mxPerimeter.RhombusPerimeter,
    [mxConstants.STYLE_FILLCOLOR]: '#dcfce7',
    [mxConstants.STYLE_STROKECOLOR]: '#16a34a',
    [mxConstants.STYLE_STROKEWIDTH]: 4,
    [mxConstants.STYLE_FONTSIZE]: 12,
    [mxConstants.STYLE_FONTCOLOR]: '#166534',
    [mxConstants.STYLE_FONTSTYLE]: mxConstants.FONT_ITALIC,
    [mxConstants.STYLE_VERTICAL_ALIGN]: mxConstants.ALIGN_MIDDLE,
    [mxConstants.STYLE_ALIGN]: mxConstants.ALIGN_CENTER,
  });

  graph.getStylesheet().putCellStyle('attributeEdge', {
    [mxConstants.STYLE_STROKECOLOR]: '#9ca3af',
    [mxConstants.STYLE_STROKEWIDTH]: 1,
    [mxConstants.STYLE_EDGE]: mxEdgeStyle.OrthConnector,
    [mxConstants.STYLE_ENDARROW]: mxConstants.NONE,
    [mxConstants.STYLE_STARTARROW]: mxConstants.NONE,
  });

  graph.getStylesheet().putCellStyle('relationEdge', {
    [mxConstants.STYLE_STROKECOLOR]: '#6b7280',
    [mxConstants.STYLE_STROKEWIDTH]: 1.5,
    [mxConstants.STYLE_EDGE]: mxEdgeStyle.OrthConnector,
    [mxConstants.STYLE_ENDARROW]: mxConstants.NONE,
    [mxConstants.STYLE_STARTARROW]: mxConstants.NONE,
    [mxConstants.STYLE_FONTSIZE]: 11,
    [mxConstants.STYLE_FONTCOLOR]: '#374151',
    [mxConstants.STYLE_LABEL_BACKGROUNDCOLOR]: '#ffffff',
  });

  graph.getStylesheet().putCellStyle('totalParticipation', {
    [mxConstants.STYLE_STROKECOLOR]: '#6b7280',
    [mxConstants.STYLE_STROKEWIDTH]: 3,
    [mxConstants.STYLE_EDGE]: mxEdgeStyle.OrthConnector,
    [mxConstants.STYLE_ENDARROW]: mxConstants.NONE,
    [mxConstants.STYLE_STARTARROW]: mxConstants.NONE,
    [mxConstants.STYLE_FONTSIZE]: 11,
    [mxConstants.STYLE_FONTCOLOR]: '#374151',
    [mxConstants.STYLE_LABEL_BACKGROUNDCOLOR]: '#ffffff',
  });
}

export function renderDiagram(editor: MxGraphEditor, model: DiagramModel): void {
  const { graph, cellNodeMap, nodeCellMap } = editor;
  const parent = graph.getDefaultParent();

  editor.originalModel = model;

  graph.getModel().beginUpdate();
  try {
    graph.removeCells(graph.getChildCells(parent, true, true));
    cellNodeMap.clear();
    nodeCellMap.clear();

    const entityNodes = model.nodes.filter(n => n.type === 'entity' || n.type === 'weakEntity');
    const relationshipNodes = model.nodes.filter(n => n.type === 'relationship' || n.type === 'identifyingRelationship');
    const attributeNodes = model.nodes.filter(n => n.type.includes('Attribute'));

    const nodePositions = calculateLayout(entityNodes, relationshipNodes, attributeNodes, model.edges);

    const cellMap = new Map<string, any>();

    for (const node of entityNodes) {
      const pos = nodePositions.get(node.id) || { x: 100, y: 100 };
      const style = node.type === 'weakEntity' ? 'weakEntity' : 'entity';
      const cell = graph.insertVertex(
        parent,
        node.id,
        node.label,
        pos.x,
        pos.y,
        ENTITY_WIDTH,
        ENTITY_HEIGHT,
        style
      );
      cell.nodeData = node;
      cellMap.set(node.id, cell);
      cellNodeMap.set(node.id, cell);
      nodeCellMap.set(cell, node.id);
    }

    for (const node of relationshipNodes) {
      const pos = nodePositions.get(node.id) || { x: 200, y: 200 };
      const style = node.type === 'identifyingRelationship' ? 'identifyingRelationship' : 'relationship';
      const cell = graph.insertVertex(
        parent,
        node.id,
        node.label,
        pos.x,
        pos.y,
        RELATIONSHIP_WIDTH,
        RELATIONSHIP_HEIGHT,
        style
      );
      cell.nodeData = node;
      cellMap.set(node.id, cell);
      cellNodeMap.set(node.id, cell);
      nodeCellMap.set(cell, node.id);
    }

    for (const node of attributeNodes) {
      const pos = nodePositions.get(node.id) || { x: 300, y: 300 };
      let style = 'simpleAttribute';
      if (node.isPrimaryKey) {
        style = 'pkAttribute';
      } else if (node.isForeignKey) {
        style = 'fkAttribute';
      } else if (node.type === 'multivaluedAttribute') {
        style = 'multivaluedAttribute';
      } else if (node.type === 'derivedAttribute') {
        style = 'derivedAttribute';
      } else if (node.type === 'compositeAttribute') {
        style = 'compositeAttribute';
      }
      const cell = graph.insertVertex(
        parent,
        node.id,
        node.label,
        pos.x,
        pos.y,
        ATTRIBUTE_WIDTH,
        ATTRIBUTE_HEIGHT,
        style
      );
      cell.nodeData = node;
      cellMap.set(node.id, cell);
      cellNodeMap.set(node.id, cell);
      nodeCellMap.set(cell, node.id);
    }

    for (const edge of model.edges) {
      const sourceCell = cellMap.get(edge.sourceId);
      const targetCell = cellMap.get(edge.targetId);
      if (sourceCell && targetCell) {
        let style = 'attributeEdge';
        let label = '';

        if (edge.sourceCardinality || edge.targetCardinality) {
          const isTotalSource = edge.sourceParticipation === 'total';
          const isTotalTarget = edge.targetParticipation === 'total';
          style = (isTotalSource || isTotalTarget) ? 'totalParticipation' : 'relationEdge';
          
          const parts: string[] = [];
          if (edge.sourceCardinality) parts.push(edge.sourceCardinality);
          if (edge.targetCardinality) parts.push(edge.targetCardinality);
          label = parts.join(' : ');
        }

        const edgeCell = graph.insertEdge(
          parent,
          edge.id,
          label,
          sourceCell,
          targetCell,
          style
        );
        edgeCell.edgeData = edge;
      }
    }
  } finally {
    graph.getModel().endUpdate();
  }
}

function calculateLayout(
  entities: DiagramNode[],
  relationships: DiagramNode[],
  attributes: DiagramNode[],
  edges: DiagramEdge[]
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  const parentMap = new Map<string, string>();
  for (const edge of edges) {
    if (!edge.sourceCardinality && !edge.targetCardinality) {
      parentMap.set(edge.targetId, edge.sourceId);
    }
  }

  const entityRow = 250;
  let entityX = 100;
  for (const entity of entities) {
    positions.set(entity.id, { x: entityX, y: entityRow });
    entityX += HORIZONTAL_SPACING;
  }

  for (const rel of relationships) {
    const connectedEdges = edges.filter(e => 
      (e.sourceId === rel.id || e.targetId === rel.id) && 
      (e.sourceCardinality || e.targetCardinality)
    );
    
    let avgX = 0;
    let count = 0;
    for (const edge of connectedEdges) {
      const otherId = edge.sourceId === rel.id ? edge.targetId : edge.sourceId;
      const otherPos = positions.get(otherId);
      if (otherPos) {
        avgX += otherPos.x;
        count++;
      }
    }
    
    const x = count > 0 ? avgX / count : 400;
    positions.set(rel.id, { x, y: entityRow + VERTICAL_SPACING + 50 });
  }

  const attributeGroups = new Map<string, DiagramNode[]>();
  for (const attr of attributes) {
    const parentId = parentMap.get(attr.id);
    if (parentId) {
      const group = attributeGroups.get(parentId) || [];
      group.push(attr);
      attributeGroups.set(parentId, group);
    }
  }

  for (const [parentId, attrs] of attributeGroups) {
    const parentPos = positions.get(parentId);
    if (!parentPos) continue;

    const isEntity = entities.some(e => e.id === parentId);
    const baseY = isEntity ? parentPos.y - VERTICAL_SPACING : parentPos.y + VERTICAL_SPACING;
    
    const startX = parentPos.x - ((attrs.length - 1) * ATTRIBUTE_SPACING) / 2;
    
    attrs.forEach((attr, index) => {
      const subAttrs = attributes.filter(a => parentMap.get(a.id) === attr.id);
      positions.set(attr.id, { 
        x: startX + index * ATTRIBUTE_SPACING, 
        y: baseY 
      });
      
      if (subAttrs.length > 0) {
        const subStartX = startX + index * ATTRIBUTE_SPACING - ((subAttrs.length - 1) * 40) / 2;
        subAttrs.forEach((subAttr, subIndex) => {
          positions.set(subAttr.id, {
            x: subStartX + subIndex * 40,
            y: baseY - 60
          });
        });
      }
    });
  }

  return positions;
}

export function extractModelFromGraph(editor: MxGraphEditor): DiagramModel {
  const { graph } = editor;
  const parent = graph.getDefaultParent();
  
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  
  const cells = graph.getChildCells(parent, true, true);
  
  for (const cell of cells) {
    if (cell.isVertex()) {
      const nodeData = cell.nodeData as DiagramNode | undefined;
      if (nodeData) {
        const geo = cell.getGeometry();
        const currentLabel = typeof cell.value === 'string' ? cell.value : nodeData.label;
        
        const updatedNode: DiagramNode = {
          ...nodeData,
          label: currentLabel,
          x: geo.x,
          y: geo.y,
          width: geo.width,
          height: geo.height,
        };
        
        if (nodeData.type === 'entity' || nodeData.type === 'weakEntity') {
          updatedNode.name = currentLabel;
        }
        
        cell.nodeData = updatedNode;
        
        nodes.push(updatedNode);
      }
    } else if (cell.isEdge()) {
      const edgeData = cell.edgeData as DiagramEdge | undefined;
      if (edgeData) {
        const updatedEdge: DiagramEdge = {
          ...edgeData,
          sourceId: cell.source?.id || edgeData.sourceId,
          targetId: cell.target?.id || edgeData.targetId,
        };
        cell.edgeData = updatedEdge;
        edges.push(updatedEdge);
      }
    }
  }
  
  return { nodes, edges };
}

export function setModelChangeListener(editor: MxGraphEditor, listener: GraphChangeListener): void {
  editor.onModelChange = listener;
}

export function getCanvasModel(editor: MxGraphEditor, model: DiagramModel): CanvasModel {
  const canvasNodes: CanvasNode[] = [];

  for (const node of model.nodes) {
    const cell = editor.cellNodeMap.get(node.id);
    if (cell) {
      const geo = cell.getGeometry();
      canvasNodes.push({
        ...node,
        graphics: {
          x: geo.x,
          y: geo.y,
          width: geo.width,
          height: geo.height,
          fontSize: 13,
          fontFamily: 'Inter, sans-serif',
          borderStyle: node.type === 'weakEntity' || node.type === 'identifyingRelationship' ? 'double' : 
                       node.type === 'derivedAttribute' ? 'dashed' : 'single',
        }
      });
    }
  }

  return {
    nodes: canvasNodes,
    edges: model.edges
  };
}

export function exportToSVG(editor: MxGraphEditor): string {
  const { graph } = editor;
  const mx = window;
  
  const bounds = graph.getGraphBounds();
  const scale = graph.view.scale;
  const border = 10;

  const width = Math.ceil(bounds.width / scale + 2 * border);
  const height = Math.ceil(bounds.height / scale + 2 * border);

  const svgDoc = document.implementation.createDocument('http://www.w3.org/2000/svg', 'svg', null);
  const svg = svgDoc.documentElement;
  svg.setAttribute('width', width.toString());
  svg.setAttribute('height', height.toString());
  svg.setAttribute('viewBox', `${bounds.x - border} ${bounds.y - border} ${width} ${height}`);
  svg.setAttribute('style', 'background-color: white');

  const svgCanvas = new mx.mxSvgCanvas2D(svg);
  svgCanvas.translate(-bounds.x + border, -bounds.y + border);
  
  const imgExport = new mx.mxImageExport();
  imgExport.drawState(graph.getView().getState(graph.model.root), svgCanvas);

  const serializer = new XMLSerializer();
  return serializer.serializeToString(svg);
}

export function exportToPNG(editor: MxGraphEditor, callback: (dataUrl: string) => void): void {
  const svgString = exportToSVG(editor);
  const svg = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svg);
  
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width * 2;
    canvas.height = img.height * 2;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      callback(canvas.toDataURL('image/png'));
    }
    URL.revokeObjectURL(url);
  };
  img.src = url;
}
