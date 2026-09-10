const tones = {
  error: 'border-danger bg-danger-bg text-danger-text',
  info: 'border-brand bg-info-bg text-[#3a4652]',
  warn: 'border-warn bg-[#fdf9ef] text-warn-text',
  success: 'border-success bg-success-bg text-success-text',
}

/** Left-rule callout used for form errors and the validity notice. */
export default function Alert({ tone = 'info', className = '', children, ...props }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      {...props}
      className={`border-l-[3px] px-3 py-2.5 text-cta leading-normal ${tones[tone]} ${className}`}
    >
      {children}
    </div>
  )
}
