export type Value = string | number | null;
export type Row = Record<string, Value>;
/** Both statements are static application SQL; values are always bound parameters. */
export interface Statement {
  sqlite: string;
  sqlserver: string;
  parameters?: Record<string, Value>;
}
export interface Transaction {
  execute(statement: Statement): Promise<void>;
  query<T extends Row>(statement: Statement): Promise<T[]>;
}
export interface Database {
  readonly provider: 'sqlite' | 'sqlserver';
  transaction<T>(work: (transaction: Transaction) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
