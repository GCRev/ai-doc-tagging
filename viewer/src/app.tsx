import { For, createSignal, type Component } from 'solid-js'

import styles from './app.module.css'
import { Doc, DocProps } from './doc'
import { Tags, TaggedDoc, Tag } from './api'

const App: Component = () => {

  let inputRef: HTMLInputElement | undefined
  const [ docs, setDocs ] = createSignal<DocProps[]>([])

  const onClick = async () => {
    if (!inputRef) { return }

    const file = inputRef.files?.[0]
    if (!file) { return }

    const text = await file.text()
    const existingDoc = docs().find(d => d.name === file.name)
    if (existingDoc) {
      setDocs(prev => prev.map(d => d.name === file.name ? { ...d, raw: text, tags: [], pending: true } : d))
    } else {
      setDocs(prev => [...prev, { 
        name: file.name,
        raw: text,
        tags: [],
        pending: true,
        onClose: () => setDocs(prev => prev.filter(d => d.name !== file.name))
      }])
    }
    
    console.log(file.name)
      
    inputRef.value = ''

    const response = await fetch('/api/process_document/' + file.name, {
      method: 'POST',
      body: file
    })
    if (response.ok) {
      const data = await response.json() as { documents: TaggedDoc[] }
      const { documents } = data

      for (const doc of documents) {
        const docTags: Tags = []
        const root = document.createElement('div')
        root.innerHTML = doc.lines.join('<br>')
        const tgs = root.querySelectorAll<HTMLElement>('tg')
        for (const tg of tgs) {
          const name = tg.getAttribute('n') || tg.textContent
          if (!name) { continue }

          const color = tg.getAttribute('c') || ''
          const tag: Tag = {
            name,
            color, 
            unique_id: tg.getAttribute('i') || '',
            positions: []
          }
          docTags.push(tag)
        }
        console.log(doc.lines)
        const raw = doc.lines.map(line => `${line}\n`).join('')
        setDocs(prev => prev.map(d => d.name === file.name ? { ...d, raw, tags: docTags, pending: false } : d))
      }
    } 
  }

  return (
    <div class={ styles.App }>
      <div class={ styles.Header }>
        <input ref={ inputRef } type="file" />
        <button onClick={ onClick }>Process</button>
      </div>
      <For each={ docs() }>
        { doc => <Doc  {...doc} /> }
      </For>
    </div>
  );
}

export default App
