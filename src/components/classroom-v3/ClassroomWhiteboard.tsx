'use client'

import { Tldraw, Editor } from 'tldraw'
import 'tldraw/tldraw.css'

interface ClassroomWhiteboardProps {
  onEditorReady: (editor: Editor) => void
}

export default function ClassroomWhiteboard({ onEditorReady }: ClassroomWhiteboardProps) {
  return (
    <div className="w-full h-full">
      <Tldraw
        onMount={(editor) => onEditorReady(editor)}
        components={{
          Toolbar: null,
          MainMenu: null,
          NavigationPanel: null,
        }}
      />
    </div>
  )
}
