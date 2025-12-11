import type {
  ERDiagramAST,
  EntityNode,
  AttributeNode,
  RelationshipNode,
  ForeignKeyTarget,
  Cardinality,
  Participation,
  KeyType,
  AttributeType,
} from '@shared/erd-types';

interface Token {
  type: string;
  value: string;
  line: number;
  column: number;
}

class Tokenizer {
  private input: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  constructor(input: string) {
    this.input = input;
  }

  tokenize(): Token[] {
    while (this.pos < this.input.length) {
      this.skipWhitespaceAndComments();
      if (this.pos >= this.input.length) break;

      const char = this.input[this.pos];

      if (char === '\n') {
        this.pos++;
        this.line++;
        this.column = 1;
        continue;
      }

      if (/[a-zA-Z_]/.test(char)) {
        this.readIdentifier();
      } else if (/[0-9]/.test(char)) {
        this.readNumber();
      } else if (char === ':') {
        this.tokens.push({ type: 'COLON', value: ':', line: this.line, column: this.column });
        this.advance();
      } else if (char === '(') {
        this.tokens.push({ type: 'LPAREN', value: '(', line: this.line, column: this.column });
        this.advance();
      } else if (char === ')') {
        this.tokens.push({ type: 'RPAREN', value: ')', line: this.line, column: this.column });
        this.advance();
      } else if (char === ',') {
        this.tokens.push({ type: 'COMMA', value: ',', line: this.line, column: this.column });
        this.advance();
      } else if (char === '.') {
        this.tokens.push({ type: 'DOT', value: '.', line: this.line, column: this.column });
        this.advance();
      } else if (char === '+') {
        this.tokens.push({ type: 'PLUS', value: '+', line: this.line, column: this.column });
        this.advance();
      } else if (char === '-' && this.peek(1) === '>') {
        this.tokens.push({ type: 'ARROW', value: '->', line: this.line, column: this.column });
        this.advance();
        this.advance();
      } else if (char === '—' || (char === '-' && this.peek(1) === '-')) {
        if (char === '—') {
          this.tokens.push({ type: 'DASH', value: '—', line: this.line, column: this.column });
          this.advance();
        } else {
          this.tokens.push({ type: 'DASH', value: '--', line: this.line, column: this.column });
          this.advance();
          this.advance();
        }
      } else {
        this.advance();
      }
    }

    this.tokens.push({ type: 'EOF', value: '', line: this.line, column: this.column });
    return this.tokens;
  }

  private peek(offset: number = 0): string {
    return this.input[this.pos + offset] || '';
  }

  private advance(): void {
    this.pos++;
    this.column++;
  }

  private skipWhitespaceAndComments(): void {
    while (this.pos < this.input.length) {
      const char = this.input[this.pos];
      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
      } else if (char === '#') {
        while (this.pos < this.input.length && this.input[this.pos] !== '\n') {
          this.advance();
        }
      } else {
        break;
      }
    }
  }

  private readIdentifier(): void {
    const startColumn = this.column;
    let value = '';
    while (this.pos < this.input.length && /[a-zA-Z0-9_]/.test(this.input[this.pos])) {
      value += this.input[this.pos];
      this.advance();
    }

    const keywords: Record<string, string> = {
      'Entity': 'ENTITY',
      'Weak': 'WEAK',
      'Relation': 'RELATION',
      'Identifying': 'IDENTIFYING',
      'Composite': 'COMPOSITE',
      'Multivalued': 'MULTIVALUED',
      'Derived': 'DERIVED',
      'PK': 'PK',
      'FK': 'FK',
      'Identified': 'IDENTIFIED',
      'By': 'BY',
      'total': 'TOTAL',
      'partial': 'PARTIAL',
      'M': 'M',
    };

    const type = keywords[value] || 'IDENTIFIER';
    this.tokens.push({ type, value, line: this.line, column: startColumn });
  }

  private readNumber(): void {
    const startColumn = this.column;
    let value = '';
    while (this.pos < this.input.length && /[0-9]/.test(this.input[this.pos])) {
      value += this.input[this.pos];
      this.advance();
    }
    if (value === '1') {
      this.tokens.push({ type: 'ONE', value: '1', line: this.line, column: startColumn });
    } else {
      this.tokens.push({ type: 'NUMBER', value, line: this.line, column: startColumn });
    }
  }
}

class Parser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): ERDiagramAST {
    const entities: EntityNode[] = [];
    const relationships: RelationshipNode[] = [];

    while (!this.isAtEnd()) {
      if (this.check('ENTITY')) {
        entities.push(this.parseEntity());
      } else if (this.check('WEAK')) {
        entities.push(this.parseWeakEntity());
      } else if (this.check('RELATION')) {
        relationships.push(this.parseRelation());
      } else if (this.check('IDENTIFYING')) {
        relationships.push(this.parseIdentifyingRelation());
      } else {
        this.advance();
      }
    }

    return { entities, relationships };
  }

  private parseEntity(): EntityNode {
    this.expect('ENTITY');
    const name = this.expect('IDENTIFIER').value;
    this.expect('COLON');
    const attributes = this.parseAttributeList();

    return {
      name,
      entityType: 'strong',
      attributes,
    };
  }

  private parseWeakEntity(): EntityNode {
    this.expect('WEAK');
    this.expect('ENTITY');
    const name = this.expect('IDENTIFIER').value;
    this.expect('COLON');
    const attributes = this.parseAttributeList();

    let identifiedBy: ForeignKeyTarget[] | undefined;
    if (this.check('IDENTIFIED')) {
      this.advance();
      this.expect('BY');
      identifiedBy = this.parseIdentifiedByList();
    }

    return {
      name,
      entityType: 'weak',
      attributes,
      identifiedBy,
    };
  }

  private parseIdentifiedByList(): ForeignKeyTarget[] {
    const targets: ForeignKeyTarget[] = [];
    targets.push(this.parseFkTarget());

    while (this.check('PLUS')) {
      this.advance();
      targets.push(this.parseFkTarget());
    }

    return targets;
  }

  private parseFkTarget(): ForeignKeyTarget {
    const entityName = this.expect('IDENTIFIER').value;
    this.expect('DOT');
    const attributeName = this.expect('IDENTIFIER').value;
    return { entityName, attributeName };
  }

  private parseAttributeList(): AttributeNode[] {
    const attributes: AttributeNode[] = [];

    while (!this.isAtEnd() && !this.isEntityOrRelationStart()) {
      if (this.check('IDENTIFIER')) {
        attributes.push(this.parseAttribute());
      } else if (this.check('IDENTIFIED')) {
        break;
      } else {
        this.advance();
      }
    }

    return attributes;
  }

  private parseAttribute(): AttributeNode {
    const name = this.expect('IDENTIFIER').value;
    let attributeType: AttributeType = 'simple';
    let keyType: KeyType = 'none';
    let fkTarget: ForeignKeyTarget | undefined;
    let dataType: string | undefined;
    let subAttributes: AttributeNode[] | undefined;

    if (this.check('PK')) {
      this.advance();
      keyType = 'pk';
    } else if (this.check('FK')) {
      this.advance();
      keyType = 'fk';
      if (this.check('ARROW')) {
        this.advance();
        fkTarget = this.parseFkTarget();
      }
    } else if (this.check('COMPOSITE')) {
      this.advance();
      attributeType = 'composite';
      this.expect('COLON');
      subAttributes = this.parseSubAttributeList();
    } else if (this.check('MULTIVALUED')) {
      this.advance();
      attributeType = 'multivalued';
    } else if (this.check('DERIVED')) {
      this.advance();
      attributeType = 'derived';
    } else if (this.check('COLON')) {
      this.advance();
      attributeType = 'typed';
      dataType = this.expect('IDENTIFIER').value;
    }

    return {
      name,
      attributeType,
      keyType,
      fkTarget,
      dataType,
      subAttributes,
    };
  }

  private parseSubAttributeList(): AttributeNode[] {
    const attributes: AttributeNode[] = [];

    while (!this.isAtEnd() && this.check('IDENTIFIER')) {
      const nextToken = this.peek(1);
      if (nextToken && (
        nextToken.type === 'PK' ||
        nextToken.type === 'FK' ||
        nextToken.type === 'COMPOSITE' ||
        nextToken.type === 'MULTIVALUED' ||
        nextToken.type === 'DERIVED'
      )) {
        break;
      }
      
      const name = this.expect('IDENTIFIER').value;
      
      if (this.isEntityOrRelationStart() || this.check('IDENTIFIED')) {
        attributes.push({
          name,
          attributeType: 'simple',
          keyType: 'none',
        });
        break;
      }
      
      attributes.push({
        name,
        attributeType: 'simple',
        keyType: 'none',
      });
      
      if (this.isEntityOrRelationStart() || this.check('IDENTIFIED')) {
        break;
      }
    }

    return attributes;
  }

  private parseRelation(): RelationshipNode {
    this.expect('RELATION');
    const leftEntity = this.expect('IDENTIFIER').value;
    this.expect('LPAREN');
    const leftCardinality = this.parseCardinality();
    let leftParticipation: Participation = 'partial';
    if (this.check('COMMA')) {
      this.advance();
      leftParticipation = this.parseParticipation();
    }
    this.expect('RPAREN');
    this.expect('DASH');
    this.expect('LPAREN');
    const rightCardinality = this.parseCardinality();
    let rightParticipation: Participation = 'partial';
    if (this.check('COMMA')) {
      this.advance();
      rightParticipation = this.parseParticipation();
    }
    this.expect('RPAREN');
    const rightEntity = this.expect('IDENTIFIER').value;
    this.expect('COLON');
    const verb = this.expect('IDENTIFIER').value;

    const attributes = this.parseRelationAttributeList();

    return {
      name: verb,
      relationshipType: 'normal',
      leftSide: {
        entityName: leftEntity,
        cardinality: leftCardinality,
        participation: leftParticipation,
      },
      rightSide: {
        entityName: rightEntity,
        cardinality: rightCardinality,
        participation: rightParticipation,
      },
      verb,
      attributes,
    };
  }

  private parseIdentifyingRelation(): RelationshipNode {
    this.expect('IDENTIFYING');
    this.expect('RELATION');
    const leftEntity = this.expect('IDENTIFIER').value;
    this.expect('LPAREN');
    const leftCardinality = this.parseCardinality();
    this.expect('RPAREN');
    this.expect('DASH');
    this.expect('LPAREN');
    const rightCardinality = this.parseCardinality();
    this.expect('RPAREN');
    const rightEntity = this.expect('IDENTIFIER').value;
    this.expect('COLON');
    const verb = this.expect('IDENTIFIER').value;

    return {
      name: verb,
      relationshipType: 'identifying',
      leftSide: {
        entityName: leftEntity,
        cardinality: leftCardinality,
        participation: 'total',
      },
      rightSide: {
        entityName: rightEntity,
        cardinality: rightCardinality,
        participation: 'total',
      },
      verb,
      attributes: [],
    };
  }

  private parseRelationAttributeList(): AttributeNode[] {
    const attributes: AttributeNode[] = [];

    while (!this.isAtEnd() && !this.isEntityOrRelationStart() && this.check('IDENTIFIER')) {
      const name = this.expect('IDENTIFIER').value;
      attributes.push({
        name,
        attributeType: 'simple',
        keyType: 'none',
      });
    }

    return attributes;
  }

  private parseCardinality(): Cardinality {
    if (this.check('ONE')) {
      this.advance();
      return '1';
    } else if (this.check('M')) {
      this.advance();
      return 'M';
    }
    throw new Error(`Expected cardinality (1 or M) at line ${this.current().line}`);
  }

  private parseParticipation(): Participation {
    if (this.check('TOTAL')) {
      this.advance();
      return 'total';
    } else if (this.check('PARTIAL')) {
      this.advance();
      return 'partial';
    }
    throw new Error(`Expected participation (total or partial) at line ${this.current().line}`);
  }

  private isEntityOrRelationStart(): boolean {
    return this.check('ENTITY') || this.check('WEAK') || this.check('RELATION') || this.check('IDENTIFYING');
  }

  private current(): Token {
    return this.tokens[this.pos];
  }

  private check(type: string): boolean {
    return !this.isAtEnd() && this.current().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.pos++;
    return this.tokens[this.pos - 1];
  }

  private expect(type: string): Token {
    if (this.check(type)) {
      return this.advance();
    }
    throw new Error(`Expected ${type} but got ${this.current().type} at line ${this.current().line}, column ${this.current().column}`);
  }

  private peek(offset: number): Token | null {
    const index = this.pos + offset;
    if (index >= this.tokens.length) return null;
    return this.tokens[index];
  }

  private isAtEnd(): boolean {
    return this.current().type === 'EOF';
  }
}

export function parseDSL(input: string): ERDiagramAST {
  const tokenizer = new Tokenizer(input);
  const tokens = tokenizer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}

export function generateDSL(ast: ERDiagramAST): string {
  const lines: string[] = [];

  for (const entity of ast.entities) {
    if (entity.entityType === 'weak') {
      lines.push(`Weak Entity ${entity.name}:`);
    } else {
      lines.push(`Entity ${entity.name}:`);
    }

    for (const attr of entity.attributes) {
      lines.push(generateAttribute(attr, '  '));
    }

    if (entity.entityType === 'weak' && entity.identifiedBy) {
      const idParts = entity.identifiedBy.map(fk => `${fk.entityName}.${fk.attributeName}`);
      lines.push(`  Identified By ${idParts.join(' + ')}`);
    }

    lines.push('');
  }

  for (const rel of ast.relationships) {
    const leftPart = rel.leftSide.participation === 'total' && rel.relationshipType === 'normal'
      ? `(${rel.leftSide.cardinality}, total)`
      : rel.leftSide.participation === 'partial' && rel.relationshipType === 'normal'
      ? `(${rel.leftSide.cardinality}, partial)`
      : `(${rel.leftSide.cardinality})`;

    const rightPart = rel.rightSide.participation === 'total' && rel.relationshipType === 'normal'
      ? `(${rel.rightSide.cardinality}, total)`
      : rel.rightSide.participation === 'partial' && rel.relationshipType === 'normal'
      ? `(${rel.rightSide.cardinality}, partial)`
      : `(${rel.rightSide.cardinality})`;

    if (rel.relationshipType === 'identifying') {
      lines.push(`Identifying Relation ${rel.leftSide.entityName} ${leftPart} — ${rightPart} ${rel.rightSide.entityName}: ${rel.verb}`);
    } else {
      lines.push(`Relation ${rel.leftSide.entityName} ${leftPart} — ${rightPart} ${rel.rightSide.entityName}: ${rel.verb}`);
    }

    for (const attr of rel.attributes) {
      lines.push(`  ${attr.name}`);
    }

    lines.push('');
  }

  return lines.join('\n').trim();
}

function generateAttribute(attr: AttributeNode, indent: string): string {
  let line = indent + attr.name;

  if (attr.keyType === 'pk') {
    line += ' PK';
  } else if (attr.keyType === 'fk' && attr.fkTarget) {
    line += ` FK -> ${attr.fkTarget.entityName}.${attr.fkTarget.attributeName}`;
  } else if (attr.attributeType === 'composite' && attr.subAttributes) {
    line += ' Composite:';
    const subLines = attr.subAttributes.map(sub => generateAttribute(sub, indent + '  '));
    return line + '\n' + subLines.join('\n');
  } else if (attr.attributeType === 'multivalued') {
    line += ' Multivalued';
  } else if (attr.attributeType === 'derived') {
    line += ' Derived';
  } else if (attr.attributeType === 'typed' && attr.dataType) {
    line += `: ${attr.dataType}`;
  }

  return line;
}
