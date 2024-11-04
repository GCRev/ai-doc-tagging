export interface Position {
  offset: number
  length: number
  path: string
}

export type Positions = Position[]

export interface Tag {
  name: string
  color: string
  unique_id: string
  positions: Positions
}

export type Tags = Tag[]

export interface TaggedDoc {
  path: string
  lines: string[]
}
