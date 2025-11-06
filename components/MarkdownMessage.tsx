'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { cn } from '@/lib/utils';

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  return (
    <div className={cn('prose prose-xs sm:prose-sm md:prose-base max-w-none', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          // Inline code
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;

            if (isInline) {
              return (
                <code className="bg-muted px-1 sm:px-1.5 py-0.5 rounded text-xs sm:text-sm font-mono break-words" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className={cn(className, 'text-xs sm:text-sm break-all')} {...props}>
                {children}
              </code>
            );
          },
          // Links open in new tab
          a({ children, href }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="break-all">
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
