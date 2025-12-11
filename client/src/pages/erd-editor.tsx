import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  Download, 
  FileJson, 
  Image, 
  FileCode,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Database,
  Loader2,
  Upload,
  PanelLeft
} from 'lucide-react';
import { sampleDSL } from '@/lib/sample-data';
import { parseDSL, generateDSL } from '@/lib/dsl-parser';
import { astToDiagramModel, diagramModelToAST } from '@/lib/diagram-model';
import { 
  initMxGraph, 
  renderDiagram, 
  getCanvasModel,
  exportToSVG,
  exportToPNG,
  extractModelFromGraph,
  setModelChangeListener,
  addShape,
  setConnectionMode,
  deleteSelected,
  type MxGraphEditor,
  type ShapeConfig
} from '@/lib/mxgraph-editor';
import ShapePalette, { type ShapeType } from '@/components/shape-palette';
import type { ERDiagramAST, DiagramModel } from '@shared/erd-types';

function waitForMxGraph(): Promise<void> {
  return new Promise((resolve, reject) => {
    const maxAttempts = 50;
    let attempts = 0;
    
    const check = () => {
      if (window.mxClient && window.mxGraph) {
        resolve();
      } else if (attempts >= maxAttempts) {
        reject(new Error('mxGraph failed to load'));
      } else {
        attempts++;
        setTimeout(check, 100);
      }
    };
    
    check();
  });
}

export default function ERDEditor() {
  const [dslInput, setDslInput] = useState(sampleDSL);
  const [currentAST, setCurrentAST] = useState<ERDiagramAST | null>(null);
  const [currentModel, setCurrentModel] = useState<DiagramModel | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mxGraphReady, setMxGraphReady] = useState(false);
  const [mxGraphError, setMxGraphError] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedTool, setSelectedTool] = useState<ShapeType | null>(null);
  const [connectionMode, setConnectionModeState] = useState(false);
  
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MxGraphEditor | null>(null);
  const isUpdatingFromDSL = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    
    waitForMxGraph()
      .then(() => {
        if (mounted && graphContainerRef.current && !editorRef.current) {
          try {
            editorRef.current = initMxGraph(graphContainerRef.current);
            
            setModelChangeListener(editorRef.current, (updatedModel) => {
              if (isUpdatingFromDSL.current) return;
              setCurrentModel(updatedModel);
            });
            
            setMxGraphReady(true);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            setMxGraphError(`Failed to initialize the diagram editor: ${errorMessage}`);
          }
        }
      })
      .catch(() => {
        if (mounted) {
          setMxGraphError('mxGraph library failed to load. Please refresh the page.');
        }
      });

    return () => {
      mounted = false;
      if (editorRef.current) {
        editorRef.current.graph.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!editorRef.current || !mxGraphReady) return;
    
    const graph = editorRef.current.graph;
    const container = graphContainerRef.current;
    if (!container) return;

    const handleClick = (evt: MouseEvent) => {
      if (!selectedTool || connectionMode) return;
      
      const rect = container.getBoundingClientRect();
      const x = evt.clientX - rect.left + graph.view.translate.x;
      const y = evt.clientY - rect.top + graph.view.translate.y;
      
      const config: ShapeConfig = {
        type: selectedTool,
        label: getDefaultLabel(selectedTool),
        x,
        y,
      };
      
      addShape(editorRef.current!, config);
      
      toast({
        title: 'Shape Added',
        description: `Added ${selectedTool} to canvas`,
      });
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [selectedTool, connectionMode, mxGraphReady, toast]);

  const getDefaultLabel = (type: ShapeType): string => {
    switch (type) {
      case 'entity': return 'Entity';
      case 'weakEntity': return 'Weak Entity';
      case 'simpleAttribute': return 'attribute';
      case 'pkAttribute': return 'id';
      case 'fkAttribute': return 'fk_id';
      case 'multivaluedAttribute': return 'values';
      case 'derivedAttribute': return 'derived';
      case 'compositeAttribute': return 'composite';
      case 'relationship': return 'relates';
      case 'identifyingRelationship': return 'identifies';
      case 'text': return 'Text';
      default: return 'Label';
    }
  };

  const handleParseAndGenerate = useCallback(() => {
    setIsLoading(true);
    setParseError(null);
    isUpdatingFromDSL.current = true;

    try {
      const ast = parseDSL(dslInput);
      setCurrentAST(ast);

      const model = astToDiagramModel(ast);
      setCurrentModel(model);

      if (editorRef.current) {
        renderDiagram(editorRef.current, model);
      }
      
      setTimeout(() => {
        isUpdatingFromDSL.current = false;
      }, 100);

      toast({
        title: 'Diagram Generated',
        description: `Parsed ${ast.entities.length} entities and ${ast.relationships.length} relationships.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown parsing error';
      setParseError(message);
      isUpdatingFromDSL.current = false;
      toast({
        title: 'Parse Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [dslInput, toast]);

  const handleImportJSON = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        if (data.ast && data.diagram) {
          setCurrentAST(data.ast);
          const model = astToDiagramModel(data.ast);
          setCurrentModel(model);
          
          if (editorRef.current) {
            renderDiagram(editorRef.current, model);
          }
          
          toast({
            title: 'JSON Imported',
            description: `Loaded ${data.ast.entities?.length || 0} entities and ${data.ast.relationships?.length || 0} relationships.`,
          });
        } else if (data.entities && data.relationships) {
          const ast: ERDiagramAST = data;
          setCurrentAST(ast);
          const model = astToDiagramModel(ast);
          setCurrentModel(model);
          
          if (editorRef.current) {
            renderDiagram(editorRef.current, model);
          }
          
          toast({
            title: 'JSON Imported',
            description: `Loaded ${ast.entities.length} entities and ${ast.relationships.length} relationships.`,
          });
        } else if (data.nodes && data.edges) {
          const model: DiagramModel = data;
          setCurrentModel(model);
          
          if (editorRef.current) {
            renderDiagram(editorRef.current, model);
          }
          
          const ast = diagramModelToAST(model);
          setCurrentAST(ast);
          
          toast({
            title: 'JSON Imported',
            description: `Loaded ${model.nodes.length} nodes and ${model.edges.length} edges.`,
          });
        } else {
          throw new Error('Invalid JSON format. Expected ERD AST, diagram model, or complete export format.');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to parse JSON';
        toast({
          title: 'Import Error',
          description: message,
          variant: 'destructive',
        });
      }
    };
    
    reader.readAsText(file);
    event.target.value = '';
  }, [toast]);

  const handleExportDSL = useCallback(() => {
    if (!editorRef.current || !currentModel) {
      toast({
        title: 'Export Error',
        description: 'Please generate a diagram first.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const liveModel = extractModelFromGraph(editorRef.current);
      const ast = diagramModelToAST(liveModel);
      const dsl = generateDSL(ast);
      
      const blob = new Blob([dsl], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'erd-diagram.dsl';
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'DSL Exported',
        description: 'The ERD DSL file has been downloaded.',
      });
    } catch (error) {
      toast({
        title: 'Export Error',
        description: 'Failed to export DSL.',
        variant: 'destructive',
      });
    }
  }, [currentModel, toast]);

  const handleExportJSON = useCallback(() => {
    if (!editorRef.current || !currentModel) {
      toast({
        title: 'Export Error',
        description: 'Please generate a diagram first.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const liveModel = extractModelFromGraph(editorRef.current);
      const liveAST = diagramModelToAST(liveModel);
      const canvasModel = getCanvasModel(editorRef.current, liveModel);
      const json = JSON.stringify({ ast: liveAST, diagram: canvasModel }, null, 2);
      
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'erd-diagram.json';
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'JSON Exported',
        description: 'The diagram model JSON has been downloaded.',
      });
    } catch (error) {
      toast({
        title: 'Export Error',
        description: 'Failed to export JSON.',
        variant: 'destructive',
      });
    }
  }, [currentModel, toast]);

  const handleExportSVG = useCallback(() => {
    if (!editorRef.current) {
      toast({
        title: 'Export Error',
        description: 'Please generate a diagram first.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const svg = exportToSVG(editorRef.current);
      
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'erd-diagram.svg';
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'SVG Exported',
        description: 'The diagram SVG has been downloaded.',
      });
    } catch (error) {
      toast({
        title: 'Export Error',
        description: 'Failed to export SVG. Using fallback method.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleExportPNG = useCallback(() => {
    if (!editorRef.current) {
      toast({
        title: 'Export Error',
        description: 'Please generate a diagram first.',
        variant: 'destructive',
      });
      return;
    }

    try {
      exportToPNG(editorRef.current, (dataUrl) => {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'erd-diagram.png';
        a.click();

        toast({
          title: 'PNG Exported',
          description: 'The diagram PNG has been downloaded.',
        });
      });
    } catch (error) {
      toast({
        title: 'Export Error',
        description: 'Failed to export PNG.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleUndo = useCallback(() => {
    if (editorRef.current?.undoManager.canUndo()) {
      editorRef.current.undoManager.undo();
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (editorRef.current?.undoManager.canRedo()) {
      editorRef.current.undoManager.redo();
    }
  }, []);

  const handleZoomIn = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.graph.zoomIn();
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.graph.zoomOut();
    }
  }, []);

  const handleFitToScreen = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.graph.fit();
      editorRef.current.graph.center();
    }
  }, []);

  const handleShapeSelect = useCallback((type: ShapeType) => {
    setSelectedTool(type);
    setConnectionModeState(false);
    if (editorRef.current) {
      setConnectionMode(editorRef.current, false);
    }
  }, []);

  const handleConnectionModeToggle = useCallback((enabled: boolean) => {
    setConnectionModeState(enabled);
    setSelectedTool(null);
    if (editorRef.current) {
      setConnectionMode(editorRef.current, enabled);
    }
  }, []);

  const handleTextAdd = useCallback((text: string, fontSize: number, fontColor: string) => {
    if (!editorRef.current) return;
    
    const config: ShapeConfig = {
      type: 'text',
      label: text,
      x: 200,
      y: 200,
      fontSize,
      fontColor,
    };
    
    addShape(editorRef.current, config);
    
    toast({
      title: 'Text Added',
      description: 'Text element added to canvas center',
    });
  }, [toast]);

  const handleDeleteSelected = useCallback(() => {
    if (editorRef.current) {
      deleteSelected(editorRef.current);
      toast({
        title: 'Deleted',
        description: 'Selected elements removed',
      });
    }
  }, [toast]);

  return (
    <div className="flex h-screen w-full bg-background">
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      {showSidebar && (
        <div className="w-[220px] min-w-[220px]">
          <ShapePalette
            onShapeSelect={handleShapeSelect}
            onConnectionModeToggle={handleConnectionModeToggle}
            onTextAdd={handleTextAdd}
            onDeleteSelected={handleDeleteSelected}
            selectedTool={selectedTool}
            connectionMode={connectionMode}
          />
        </div>
      )}

      <div className="flex flex-col w-[400px] min-w-[400px] border-r border-border bg-card">
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSidebar(!showSidebar)}
            title={showSidebar ? 'Hide shape palette' : 'Show shape palette'}
          >
            <PanelLeft className="h-5 w-5" />
          </Button>
          <Database className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold text-foreground">ERD Engine</h1>
        </div>
        
        <Tabs defaultValue="dsl" className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-2">
            <TabsTrigger value="dsl" className="flex-1">DSL Input</TabsTrigger>
            <TabsTrigger value="import" className="flex-1">Import</TabsTrigger>
          </TabsList>

          <TabsContent value="dsl" className="flex-1 flex flex-col p-4 gap-4 overflow-hidden mt-0">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                ERD DSL Input
              </label>
              {parseError && (
                <span className="text-xs text-destructive">Parse Error</span>
              )}
            </div>
            
            <textarea
              data-testid="input-dsl"
              value={dslInput}
              onChange={(e) => setDslInput(e.target.value)}
              className="flex-1 min-h-0 w-full resize-none rounded-md border border-input bg-background px-3 py-2 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              placeholder="Enter your ERD DSL here..."
              spellCheck={false}
            />

            <div className="flex flex-col gap-2">
              <Button
                data-testid="button-parse"
                onClick={handleParseAndGenerate}
                disabled={isLoading || !dslInput.trim() || !mxGraphReady}
                className="w-full"
              >
                <Play className="mr-2 h-4 w-4" />
                {isLoading ? 'Parsing...' : !mxGraphReady ? 'Loading Editor...' : 'Parse & Generate Diagram'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="import" className="flex-1 flex flex-col p-4 gap-4 overflow-hidden mt-0">
            <div className="flex flex-col gap-4">
              <div className="text-sm text-muted-foreground">
                Import an ERD diagram from a JSON file. Supported formats:
              </div>
              <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                <li>Complete export (AST + diagram)</li>
                <li>ERD AST (entities + relationships)</li>
                <li>Diagram model (nodes + edges)</li>
              </ul>
              
              <Button
                onClick={handleImportJSON}
                disabled={!mxGraphReady}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                Import JSON File
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="p-4 border-t border-border">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Export Options
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              data-testid="button-export-dsl"
              variant="outline"
              size="sm"
              onClick={handleExportDSL}
              disabled={!currentModel}
            >
              <FileCode className="mr-2 h-4 w-4" />
              DSL
            </Button>
            <Button
              data-testid="button-export-json"
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              disabled={!currentModel}
            >
              <FileJson className="mr-2 h-4 w-4" />
              JSON
            </Button>
            <Button
              data-testid="button-export-svg"
              variant="outline"
              size="sm"
              onClick={handleExportSVG}
              disabled={!currentModel}
            >
              <Download className="mr-2 h-4 w-4" />
              SVG
            </Button>
            <Button
              data-testid="button-export-png"
              variant="outline"
              size="sm"
              onClick={handleExportPNG}
              disabled={!currentModel}
            >
              <Image className="mr-2 h-4 w-4" />
              PNG
            </Button>
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Keyboard Shortcuts:</p>
            <p>Ctrl+Z: Undo | Ctrl+Y: Redo</p>
            <p>Delete: Remove selected</p>
            <p>Double-click: Edit label</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border bg-card">
          <div className="flex items-center gap-1">
            <Button
              data-testid="button-undo"
              variant="ghost"
              size="icon"
              onClick={handleUndo}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              data-testid="button-redo"
              variant="ghost"
              size="icon"
              onClick={handleRedo}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="mx-2 h-6" />
            <Button
              data-testid="button-zoom-in"
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              data-testid="button-zoom-out"
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              data-testid="button-fit"
              variant="ghost"
              size="icon"
              onClick={handleFitToScreen}
              title="Fit to Screen"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {selectedTool && (
              <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                Tool: {selectedTool}
              </span>
            )}
            {connectionMode && (
              <span className="bg-blue-500/10 text-blue-600 px-2 py-1 rounded">
                Connect Mode
              </span>
            )}
            {currentAST && (
              <span>
                {currentAST.entities.length} entities, {currentAST.relationships.length} relationships
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden bg-slate-50 dark:bg-slate-900">
          <div 
            ref={graphContainerRef}
            data-testid="graph-container"
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              cursor: selectedTool ? 'crosshair' : connectionMode ? 'crosshair' : 'default',
            }}
          />

          {!mxGraphReady && !mxGraphError && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Card className="p-8 text-center max-w-md bg-background/80 backdrop-blur-sm">
                <Loader2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-spin" />
                <h2 className="text-lg font-semibold mb-2 text-foreground">Loading Editor</h2>
                <p className="text-sm text-muted-foreground">
                  Initializing the diagram editor...
                </p>
              </Card>
            </div>
          )}

          {mxGraphError && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Card className="p-8 text-center max-w-md bg-background/80 backdrop-blur-sm border-destructive">
                <Database className="h-12 w-12 mx-auto mb-4 text-destructive" />
                <h2 className="text-lg font-semibold mb-2 text-foreground">Editor Error</h2>
                <p className="text-sm text-muted-foreground">{mxGraphError}</p>
              </Card>
            </div>
          )}

          {mxGraphReady && !currentModel && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Card className="p-8 text-center max-w-md bg-background/80 backdrop-blur-sm">
                <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-lg font-semibold mb-2 text-foreground">Start Creating</h2>
                <p className="text-sm text-muted-foreground">
                  Use the shape palette on the left to draw ERD elements, or enter DSL code to generate a diagram automatically.
                </p>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
