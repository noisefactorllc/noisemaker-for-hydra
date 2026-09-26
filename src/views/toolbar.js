import html from 'choo/html'

export default function toolbar(state, emit) {
    const hidden = state.showInfo ? 'hidden' : ''

    const { t } = state.translation

    const dispatch = (eventName) => (e) => emit(eventName, e)

    // Each control is a real <button type="button"> so it is reachable with
    // Tab and activated with Enter or Space by default (GAP-005). The
    // decorative fontawesome <i> inside stays aria-hidden; the button itself
    // carries the accessible name through aria-label.
    const icon = (id, className, title, event) => html`
        <button type="button" id="${id}-button" class="icon-button" title="${title}" aria-label="${title}" onclick=${dispatch(event)}>
            <i id="${id}-icon" class="fas icon ${className}" aria-hidden="true"></i>
        </button>`

    const toggleInfo = state.showInfo ? icon("close", "fa-times", t('toolbar.hide-info'), 'ui: toggle info') : icon("close", "fa-question-circle", t('toolbar.show-info'), 'ui: toggle info')

    const toggleExtensions = !state.showExtensions ? icon("add", "fa-solid fa-puzzle-piece", t('toolbar.load-extension'), 'ui: show extensions') : icon("close", "fa-question-circle", t('toolbar.show-info'), 'ui: hide extensions')

    return html`<div id="toolbar-container">
        ${icon("run", `fa-play-circle ${hidden}`, t('toolbar.run'), 'editor: eval all')}
        ${icon("clear", `fa fa-trash ${hidden}`, t('toolbar.clear'), 'clear all')}
        ${toggleExtensions}
        ${icon("shuffle", `fa-random`, t('toolbar.shuffle'), 'gallery:showExample')}
        ${icon("mutator", `fa-dice ${hidden}`, t('toolbar.random'), 'editor: randomize')}
        ${state.serverURL === null ? '' : icon("share", `fa-upload ${hidden}`, t('toolbar.upload'), 'gallery:shareSketch')}
        ${toggleInfo}
    </div>`
}
