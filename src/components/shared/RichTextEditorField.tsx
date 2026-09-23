'use client';

import { Text } from '@mantine/core';
import { Link, RichTextEditor } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export function RichTextEditorField({
  label,
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    // @tiptap/starter-kit@3 bundles its own Link extension; disable it so it
    // doesn't collide with @mantine/tiptap's Link (which drives the toolbar's
    // link/unlink buttons) — otherwise tiptap warns "Duplicate extension
    // names found: ['link']" and the toolbar's link button binds to the
    // wrong instance.
    extensions: [StarterKit.configure({ link: false }), Link],
    content: value,
    // Required for Next.js SSR — tiptap otherwise renders once on the server
    // and once on the client, producing a hydration mismatch.
    immediatelyRender: false,
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
  });

  return (
    <div>
      {label && (
        <Text size="sm" fw={500} mb={4}>
          {label}
        </Text>
      )}
      <RichTextEditor editor={editor}>
        <RichTextEditor.Toolbar sticky>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Bold />
            <RichTextEditor.Italic />
            <RichTextEditor.Strikethrough />
            <RichTextEditor.ClearFormatting />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.H2 />
            <RichTextEditor.H3 />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.BulletList />
            <RichTextEditor.OrderedList />
            <RichTextEditor.Blockquote />
          </RichTextEditor.ControlsGroup>
          <RichTextEditor.ControlsGroup>
            <RichTextEditor.Link />
            <RichTextEditor.Unlink />
          </RichTextEditor.ControlsGroup>
        </RichTextEditor.Toolbar>
        <RichTextEditor.Content />
      </RichTextEditor>
    </div>
  );
}
