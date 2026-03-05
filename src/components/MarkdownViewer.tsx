import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from './ui';

interface MarkdownViewerProps {
    content: string;
    className?: string;
}

export function MarkdownViewer({ content, className }: MarkdownViewerProps) {
    return (
        <div className={cn("text-left font-sans leading-relaxed", className)}>
            <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({node, className, ...props}) => <h1 className={cn("text-4xl font-black mb-6 rotate-[-1deg] bg-white inline-block px-4 py-2 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]", className)} {...props} />,
                    h2: ({node, className, ...props}) => <h2 className={cn("text-3xl font-black mt-8 mb-4 border-b-4 border-black pb-2 inline-block", className)} {...props} />,
                    h3: ({node, className, ...props}) => <h3 className={cn("text-2xl font-black mt-6 mb-3 rotate-[1deg] bg-yellow-100 inline-block px-2 border-2 border-black shadow-sm", className)} {...props} />,
                    h4: ({node, className, ...props}) => <h4 className={cn("text-xl font-bold mt-4 mb-2", className)} {...props} />,
                    p: ({node, className, ...props}) => <p className={cn("mb-4 text-gray-800", className)} {...props} />,
                    ul: ({node, className, ...props}) => <ul className={cn("list-disc pl-6 mb-4 space-y-2", className)} {...props} />,
                    ol: ({node, className, ...props}) => <ol className={cn("list-decimal pl-6 mb-4 space-y-2", className)} {...props} />,
                    li: ({node, className, ...props}) => <li className={cn("pl-1", className)} {...props} />,
                    blockquote: ({node, className, ...props}) => (
                        <blockquote className={cn("border-l-4 border-black pl-4 py-2 my-4 bg-gray-50 italic font-medium", className)} {...props} />
                    ),
                    code: ({node, className, children, ...props}: any) => {
                        const match = /language-(\w+)/.exec(className || '')
                        const isInline = !match && !String(children).includes('\n');
                        return isInline ? (
                            <code className={cn("bg-gray-200 px-1.5 py-0.5 rounded font-mono text-sm border border-gray-300 font-bold text-red-600", className)} {...props}>
                                {children}
                            </code>
                        ) : (
                            <code className={className} {...props}>
                                {children}
                            </code>
                        )
                    },
                    strong: ({node, className, ...props}) => <strong className={cn("font-black text-black", className)} {...props} />,
                    hr: ({node, className, ...props}) => <hr className={cn("border-2 border-black border-dashed my-8", className)} {...props} />,
                    table: ({node, className, ...props}) => <div className="overflow-x-auto my-4"><table className={cn("min-w-full border-2 border-black", className)} {...props} /></div>,
                    thead: ({node, className, ...props}) => <thead className={cn("bg-gray-100 border-b-2 border-black", className)} {...props} />,
                    th: ({node, className, ...props}) => <th className={cn("p-3 text-left font-black border-r-2 border-black last:border-r-0", className)} {...props} />,
                    td: ({node, className, ...props}) => <td className={cn("p-3 border-r-2 border-gray-300 last:border-r-0 border-b border-gray-200", className)} {...props} />,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
