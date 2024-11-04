import { For, Show, Suspense, createEffect, createMemo, createResource, on } from 'solid-js'
import { type Tag, type Tags } from './api'

import styles from './doc.module.css'
import './doc.css'

export interface DocProps {
  name: string
  raw: string
  tags: Tags
  onClose?: () => void
  pending?: boolean
}

const pandoc = async (raw: string) => {
  const response = await fetch('/api/pandoc', {
    method: 'POST',
    body: raw
  })
  if (response.ok) {
    return await response.text()
  }
  return ''
}

export const Doc = (props: DocProps) => {

  const [ file ] = createResource(props.raw, pandoc)
  const lines = createMemo(() => props.raw.split('\n').join('<br>'))

  createEffect(on([ file ], () => {
    if (!contentRef) { return }

    const tgs = contentRef.querySelectorAll<HTMLElement>('tg')
    for (const tg of tgs) {
      const color = tg.getAttribute('c') || ''
      if (!color) { continue }
      tg.style.setProperty('--bg', color)
    }
  }))

  let contentRef: HTMLDivElement | undefined

  const onMouseEnter = (tag: Tag) => {
    const targets = document.querySelectorAll(`tg[i="${tag.unique_id}"]`)
    for (const target of targets) {
      target.classList.add('highlight')
    } 
  }
  
  const onMouseLeave = () => {
    const targets = document.querySelectorAll('tg.highlight')
    for (const target of targets) {
      target.classList.remove('highlight')
    }
  }

  return (
    <div class={ styles.Document }>
      <Show when={ props.pending }>
        <svg class={ styles.Pending } viewBox='0 0 1000 10' preserveAspectRatio='none'>
          <line x1='0' y1='5' x2='1000' y2='5' stroke-width='10'/>
        </svg>
      </Show>
      <h2 class={ styles.Header } >{ props.name }</h2>
      <Suspense fallback={ 
        <div class={ styles.Content } innerHTML={ lines() }/>
      }>
        <div ref={ contentRef } class={ styles.Content } innerHTML={ file() }/>
      </Suspense>
      <div class={ styles.Tags }>
        <For each={ props.tags }>
          { (tag, i) => <div 
            onMouseEnter={ () => onMouseEnter(tag) } 
            onMouseLeave={ onMouseLeave }
            class={ styles.Tag } 
            style={ { '--bg': tag.color, '--delay': `${Math.random() * 30 + (i() * 80)}ms` } }>
            { tag.name }
          </div> }
        </For>
        <button class={ styles.Close } onClick={ props.onClose }>&#10005;</button>
      </div>
    </div>
  )
}

