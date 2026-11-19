import {useEffect, useState} from 'react';
import {ArrowLeft, ArrowRight, ArrowUpRight, Check, List, Pause, Play} from 'lucide-react';
import {tourSlides} from './tourSlides';
import './product-tour.css';

const intervalMs = 18000;

export function ProductTour() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const slide = tourSlides[index];
  const Icon = slide.icon;

  function select(next: number) {
    setPlaying(false);
    setIndex((next + tourSlides.length) % tourSlides.length);
  }

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex(current => (current + 1) % tourSlides.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [playing]);

  return (
    <section
      id="how"
      className="product-tour"
      aria-labelledby="product-tour-title"
      aria-roledescription="carousel"
      onKeyDown={event => {
        if (event.altKey || event.ctrlKey || event.metaKey || event.target instanceof HTMLSelectElement) return;
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        select(index + (event.key === 'ArrowRight' ? 1 : -1));
      }}
    >
      <div className="tour-toolbar">
        <h2 id="product-tour-title"><List size={19} aria-hidden="true"/> Product tour</h2>
        <span className="tour-count">{String(index + 1).padStart(2, '0')} / {String(tourSlides.length).padStart(2, '0')}</span>
        <div className="tour-controls">
          <button type="button" onClick={() => setPlaying(value => !value)} aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}>
            {playing ? <Pause size={17}/> : <Play size={17}/>}
            <span>{playing ? 'Pause' : 'Play'}</span>
          </button>
          <button type="button" onClick={() => select(index - 1)} aria-label="Previous slide"><ArrowLeft size={19}/></button>
          <button type="button" className="tour-next" onClick={() => select(index + 1)} aria-label="Next slide"><ArrowRight size={19}/></button>
        </div>
      </div>
      <label className="tour-mobile-chapter">
        <span>Jump to a chapter</span>
        <select value={index} onChange={event => select(Number(event.target.value))}>
          {tourSlides.map((item, position) => <option key={item.label} value={position}>{item.label}</option>)}
        </select>
      </label>
      <article className="tour-slide" aria-live={playing ? 'off' : 'polite'} aria-atomic="true">
        <div className="tour-copy">
          <span className="tour-label"><Icon size={17} aria-hidden="true"/> {slide.label}</span>
          <h3>{slide.title}</h3>
          <p>{slide.description}</p>
          <ul>{slide.features.map(feature => <li key={feature}><Check size={16} aria-hidden="true"/><span>{feature}</span></li>)}</ul>
          <a href={'#' + slide.href} className="text-link" onFocus={() => setPlaying(false)}>{slide.link} <ArrowUpRight size={16}/></a>
        </div>
        <div className="tour-example">
          <div className="tour-example-header"><span className="tour-example-icon"><Icon size={24}/></span><span>Fictional example</span></div>
          <h4>{slide.scene}</h4>
          <ol aria-label="Example workflow">
            {slide.timeline.map(([title, detail]) => <li key={title}><span className="tour-node" aria-hidden="true"/><div><b>{title}</b><small>{detail}</small></div></li>)}
          </ol>
        </div>
      </article>
      <nav className="tour-chapters" aria-label="Slideshow chapters">
        {tourSlides.map((item, position) => <button key={item.label} type="button" aria-current={index === position ? 'step' : undefined} onClick={() => select(position)}><item.icon size={16} aria-hidden="true"/> {item.label}</button>)}
      </nav>
    </section>
  );
}
