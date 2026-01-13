export default function HTMLPreview({
  value
}) {
  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: value }} />
    </div>
  )
}