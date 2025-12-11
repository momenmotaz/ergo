import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Square,
  Circle,
  Diamond,
  Minus,
  Type,
  ChevronDown,
  ChevronRight,
  Link2,
  Trash2,
  MousePointer,
} from 'lucide-react';

export type ShapeType = 
  | 'entity' 
  | 'weakEntity' 
  | 'simpleAttribute' 
  | 'pkAttribute' 
  | 'fkAttribute'
  | 'multivaluedAttribute' 
  | 'derivedAttribute' 
  | 'compositeAttribute' 
  | 'relationship' 
  | 'identifyingRelationship'
  | 'text';

export interface ShapeItem {
  type: ShapeType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface ShapePaletteProps {
  onShapeSelect: (type: ShapeType) => void;
  onConnectionModeToggle: (enabled: boolean) => void;
  onTextAdd: (text: string, fontSize: number, fontColor: string) => void;
  onDeleteSelected: () => void;
  selectedTool: string | null;
  connectionMode: boolean;
}

const entityShapes: ShapeItem[] = [
  {
    type: 'entity',
    label: 'Entity',
    icon: <Square className="h-4 w-4" />,
    description: 'Strong entity',
  },
  {
    type: 'weakEntity',
    label: 'Weak Entity',
    icon: <Square className="h-4 w-4 stroke-2" strokeWidth={3} />,
    description: 'Weak entity (double border)',
  },
];

const attributeShapes: ShapeItem[] = [
  {
    type: 'simpleAttribute',
    label: 'Simple Attribute',
    icon: <Circle className="h-4 w-4" />,
    description: 'Simple attribute',
  },
  {
    type: 'pkAttribute',
    label: 'Primary Key',
    icon: <Circle className="h-4 w-4 fill-yellow-200 stroke-yellow-600" />,
    description: 'Primary key attribute',
  },
  {
    type: 'fkAttribute',
    label: 'Foreign Key',
    icon: <Circle className="h-4 w-4 fill-blue-200 stroke-blue-600" />,
    description: 'Foreign key attribute',
  },
  {
    type: 'multivaluedAttribute',
    label: 'Multivalued',
    icon: <Circle className="h-4 w-4 stroke-2" strokeWidth={3} />,
    description: 'Multivalued attribute (double border)',
  },
  {
    type: 'derivedAttribute',
    label: 'Derived',
    icon: <Circle className="h-4 w-4" style={{ strokeDasharray: '4 2' }} />,
    description: 'Derived attribute (dashed)',
  },
  {
    type: 'compositeAttribute',
    label: 'Composite',
    icon: <Circle className="h-4 w-4 fill-indigo-200 stroke-indigo-600" />,
    description: 'Composite attribute',
  },
];

const relationshipShapes: ShapeItem[] = [
  {
    type: 'relationship',
    label: 'Relationship',
    icon: <Diamond className="h-4 w-4" />,
    description: 'Normal relationship',
  },
  {
    type: 'identifyingRelationship',
    label: 'Identifying',
    icon: <Diamond className="h-4 w-4 stroke-2" strokeWidth={3} />,
    description: 'Identifying relationship (double border)',
  },
];

export default function ShapePalette({
  onShapeSelect,
  onConnectionModeToggle,
  onTextAdd,
  onDeleteSelected,
  selectedTool,
  connectionMode,
}: ShapePaletteProps) {
  const [entityOpen, setEntityOpen] = useState(true);
  const [attributeOpen, setAttributeOpen] = useState(true);
  const [relationshipOpen, setRelationshipOpen] = useState(true);
  const [textOpen, setTextOpen] = useState(true);
  
  const [textInput, setTextInput] = useState('');
  const [fontSize, setFontSize] = useState(14);
  const [fontColor, setFontColor] = useState('#333333');

  const handleAddText = () => {
    if (textInput.trim()) {
      onTextAdd(textInput, fontSize, fontColor);
      setTextInput('');
    }
  };

  const renderShapeButton = (shape: ShapeItem) => (
    <Button
      key={shape.type}
      variant={selectedTool === shape.type ? 'default' : 'outline'}
      size="sm"
      className="w-full justify-start gap-2 h-9"
      onClick={() => onShapeSelect(shape.type)}
      title={shape.description}
    >
      {shape.icon}
      <span className="text-xs">{shape.label}</span>
    </Button>
  );

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      <div className="p-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Shape Palette</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Click a shape, then click on canvas to place
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          <div className="flex gap-2">
            <Button
              variant={!selectedTool && !connectionMode ? 'default' : 'outline'}
              size="sm"
              className="flex-1 gap-2"
              onClick={() => {
                onShapeSelect(null as any);
                onConnectionModeToggle(false);
              }}
            >
              <MousePointer className="h-4 w-4" />
              Select
            </Button>
            <Button
              variant={connectionMode ? 'default' : 'outline'}
              size="sm"
              className="flex-1 gap-2"
              onClick={() => onConnectionModeToggle(!connectionMode)}
            >
              <Link2 className="h-4 w-4" />
              Connect
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 text-destructive hover:text-destructive"
            onClick={onDeleteSelected}
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected
          </Button>

          <Separator />

          <Collapsible open={entityOpen} onOpenChange={setEntityOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between px-2">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Entities
                </span>
                {entityOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1">
              {entityShapes.map(renderShapeButton)}
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={attributeOpen} onOpenChange={setAttributeOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between px-2">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Attributes
                </span>
                {attributeOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1">
              {attributeShapes.map(renderShapeButton)}
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={relationshipOpen} onOpenChange={setRelationshipOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between px-2">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Relationships
                </span>
                {relationshipOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1">
              {relationshipShapes.map(renderShapeButton)}
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          <Collapsible open={textOpen} onOpenChange={setTextOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between px-2">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Text Tool
                </span>
                {textOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 mt-2">
              <div className="space-y-2">
                <Label htmlFor="text-input" className="text-xs">Text Content</Label>
                <Input
                  id="text-input"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Enter text..."
                  className="h-8 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="font-size" className="text-xs">Font Size</Label>
                  <Input
                    id="font-size"
                    type="number"
                    min={8}
                    max={72}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="font-color" className="text-xs">Color</Label>
                  <div className="flex gap-1">
                    <Input
                      id="font-color"
                      type="color"
                      value={fontColor}
                      onChange={(e) => setFontColor(e.target.value)}
                      className="h-8 w-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={fontColor}
                      onChange={(e) => setFontColor(e.target.value)}
                      className="h-8 text-xs flex-1"
                    />
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={handleAddText}
                disabled={!textInput.trim()}
              >
                <Type className="h-4 w-4" />
                Add Text to Canvas
              </Button>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          <div className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground block px-2">
              Lines
            </span>
            <Button
              variant={connectionMode ? 'default' : 'outline'}
              size="sm"
              className="w-full justify-start gap-2 h-9"
              onClick={() => onConnectionModeToggle(!connectionMode)}
            >
              <Minus className="h-4 w-4" />
              <span className="text-xs">Draw Line (Connect Mode)</span>
            </Button>
            <p className="text-xs text-muted-foreground px-2">
              Enable connect mode, then drag from one shape to another to create a line.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
