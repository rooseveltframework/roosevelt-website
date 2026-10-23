// replace title attributes with tooltips, which are popovers placed with css anchor positioning
//
// this is a progressive enhancement: a browser without those features (e.g. safari before 26 or firefox before 147) is left with the title attributes as they are, which it shows as plain tooltips
//
// there is one tooltip element, a popover that is shown for one element at a time and anchored to it; css places it above the element (or wherever data-tooltip-placement says), flips it to the other side if there is no room, and keeps it attached while the page scrolls (see tooltips.scss)
//
// a tooltip shows when the pointer goes over an element or the element is focused from the keyboard, and hides when the pointer leaves, the element is clicked, or escape is pressed; on a touchscreen, tapping an element shows its tooltip and tapping it again or anywhere else hides it
//
// the pointer can be moved from an element onto its tooltip without the tooltip disappearing, which matters to people who zoom in (see https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus)
const PLACEMENTS = ['top', 'bottom', 'left', 'right']
const OPPOSITE = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }
const FADE_OUT = 250 // ms the tooltip takes to fade out, as tooltips.scss says, before it's closed

const supported = typeof window !== 'undefined' && 'popover' in window.HTMLElement.prototype && window.CSS?.supports?.('anchor-name: --tooltip') && window.CSS.supports('position-area: top') && window.CSS.supports('position-try-fallbacks: flip-block')

let tooltip = null // the one tooltip element, made the first time it's needed
let shownFor = null // the element the tooltip is currently shown for
let shownBy = null // what showed it: 'pointer', 'focus', or 'touch'
let clickedOn = null // an element that was clicked, whose tooltip stays hidden until the pointer leaves it
let describedBy = null // the element's aria-describedby from before its tooltip was shown, put back once its tooltip is hidden
let fadingOut = null // the timer that closes the tooltip once it's faded out

function tooltipElement () {
  if (tooltip?.isConnected) return tooltip
  tooltip = document.createElement('div')
  tooltip.id = 'tooltip'
  tooltip.popover = 'manual' // so showing it closes nothing else
  tooltip.setAttribute('role', 'tooltip')
  tooltip.innerHTML = '<div class="tooltip-frame"><div class="tooltip-box"><span class="tooltip-text"></span></div></div>' // the frame fills the space between the tooltip and its element, so the pointer can cross that space without leaving the tooltip
  document.body.appendChild(tooltip)
  return tooltip
}

// whether a node is part of the tooltip
const inTooltip = (node) => Boolean(tooltip && node && tooltip.contains(node))

function show (element, by) {
  if (element === shownFor) return
  hide()
  shownBy = by
  const box = tooltipElement()
  box.querySelector('.tooltip-text').textContent = element.getAttribute('data-tooltip')
  const placement = element.getAttribute('data-tooltip-placement')
  box.dataset.placement = PLACEMENTS.includes(placement) ? placement : 'top'
  box.dataset.side = box.dataset.placement
  // it fades in: it's opened transparent, and made opaque once the browser has drawn it that way, which css transitions
  clearTimeout(fadingOut)
  if (box.matches(':popover-open')) box.hidePopover() // (still fading out from another element, so it's opened again, anchored to this one)
  box.dataset.state = 'hidden'
  box.showPopover({ source: element })
  shownFor = element
  describedBy = element.getAttribute('aria-describedby')
  element.setAttribute('aria-describedby', [describedBy, 'tooltip'].filter(Boolean).join(' '))
  side() // (which also has the browser work out its style as it is, transparent, so the change below is transitioned)
  box.dataset.state = 'visible'
}

function hide () {
  if (!shownFor) return
  if (describedBy) shownFor.setAttribute('aria-describedby', describedBy)
  else shownFor.removeAttribute('aria-describedby')
  shownFor = null
  shownBy = null
  describedBy = null
  if (!tooltip?.matches(':popover-open')) return
  // it fades out before it's closed, unless it's shown again by then
  tooltip.dataset.state = 'hidden'
  clearTimeout(fadingOut)
  fadingOut = setTimeout(() => { if (!shownFor && tooltip.matches(':popover-open')) tooltip.hidePopover() }, FADE_OUT)
}

// which side of its element the tooltip ended up on once the browser placed it, which can be the opposite of the side asked for if there was no room there, so the arrow and the space between them can be put on the right side
//
// it's measured before the tooltip is painted, and again whenever scrolling or resizing could have flipped it
function side () {
  if (!shownFor) return
  const placement = tooltip.dataset.placement
  const box = tooltip.querySelector('.tooltip-box').getBoundingClientRect()
  const element = shownFor.getBoundingClientRect()
  const centre = { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 }
  const flipped = {
    top: centre.y > element.bottom,
    bottom: centre.y < element.top,
    left: centre.x > element.right,
    right: centre.x < element.left
  }[placement]
  const wanted = flipped ? OPPOSITE[placement] : placement
  if (tooltip.dataset.side !== wanted) tooltip.dataset.side = wanted
}

// gives every element with a title attribute a tooltip, except iframes and elements with a data-tooltip-skip attribute; it's run again whenever the page adds elements with titles, e.g. search results
function enhanceTitleAttributes () {
  if (!supported) return
  if (shownFor && !shownFor.isConnected) hide() // the element the tooltip was shown for may have been replaced
  document.querySelectorAll('[title]:not(iframe)').forEach(element => {
    if (element.hasAttribute('data-tooltip-skip')) return
    element.setAttribute('data-tooltip', element.getAttribute('title'))
    element.removeAttribute('title') // the title attribute is removed so the browser doesn't show it as a tooltip too
  })
}

if (supported) {
  // touches are handled on pointerdown below, because a touch's pointer only goes over what is tapped as it is tapped
  document.addEventListener('pointerover', event => {
    if (event.pointerType === 'touch' || inTooltip(event.target)) return
    const element = event.target.closest('[data-tooltip]')
    // a tooltip shown by keyboard focus stays while the pointer goes over other things, e.g. as the page scrolls the focused element into view under a pointer that isn't moving
    if (!element) return shownBy === 'focus' ? undefined : hide()
    if (element !== clickedOn) show(element, 'pointer')
  })
  document.addEventListener('pointerout', event => {
    if (event.pointerType === 'touch') return
    if (inTooltip(event.target)) {
      if (!inTooltip(event.relatedTarget) && !shownFor?.contains(event.relatedTarget)) hide()
      return
    }
    const element = event.target.closest('[data-tooltip]')
    if (!element || element.contains(event.relatedTarget) || (element === shownFor && inTooltip(event.relatedTarget))) return
    if (element === clickedOn) clickedOn = null
    if (element === shownFor) hide()
  })
  document.addEventListener('focusin', event => {
    const element = event.target.closest('[data-tooltip]')
    if (element?.matches(':focus-visible')) show(element, 'focus')
  })
  document.addEventListener('focusout', event => { if (shownFor?.contains(event.target)) hide() })
  document.addEventListener('pointerdown', event => {
    if (inTooltip(event.target)) return
    const element = event.target.closest('[data-tooltip]')
    if (event.pointerType === 'touch') {
      const showing = element && element === shownFor
      hide()
      if (element && !showing) show(element, 'touch')
      return
    }
    clickedOn = element
    hide()
  }, true)
  document.addEventListener('keydown', event => { if (event.key === 'Escape') hide() })
  // the browser can take a frame or two after scrolling to flip the tooltip, so it's measured on the next two frames, and again once scrolling stops
  const remeasure = () => window.requestAnimationFrame(() => { side(); window.requestAnimationFrame(side) })
  window.addEventListener('scroll', remeasure, { capture: true, passive: true })
  window.addEventListener('scrollend', side, { capture: true, passive: true })
  window.addEventListener('resize', remeasure, { passive: true })
}

module.exports = { enhanceTitleAttributes }
