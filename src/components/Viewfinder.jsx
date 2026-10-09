// Рамка видоискателя поверх кадра: уголки, центр, направляющие 2.39:1 и служебные подписи.
// Чисто декоративный слой (aria-hidden), не перекрывает и не меняет фотографию.
export function Viewfinder({ topLeft, topRight, bottomLeft, bottomRight, guides = true, className = "", children }) {
  return (
    <div className={`vf ${className}`} aria-hidden="true">
      <span className="vf__corner vf__corner--tl" />
      <span className="vf__corner vf__corner--tr" />
      <span className="vf__corner vf__corner--bl" />
      <span className="vf__corner vf__corner--br" />
      <span className="vf__center" />
      {guides ? <span className="vf__guides" /> : null}
      {topLeft ? <span className="vf__label vf__label--tl">{topLeft}</span> : null}
      {topRight ? <span className="vf__label vf__label--tr">{topRight}</span> : null}
      {bottomLeft ? <span className="vf__label vf__label--bl">{bottomLeft}</span> : null}
      {bottomRight ? <span className="vf__label vf__label--br">{bottomRight}</span> : null}
      {children}
    </div>
  );
}
