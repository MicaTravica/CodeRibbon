const {
  // PaneContainer,
  crdebug,
  crlogger,
  global_cr_update,
  get_cr_panecontainer,
  metrics
} = require('./cr-base');

const {
  scrollPatchIntoView
} = require('./cr-common');

const CodeRibbonRibbonContainer = require('./code-ribbon-ribbon-container');
// const CodeRibbonSingleRibbon = require('./code-ribbon-single-ribbon');
const CodeRibbonPatch = require('./code-ribbon-patch');

const {CompositeDisposable} = require('atom');

const NetworkGraph = require('./visualization/network-graph');
const FileDiff = require('./visualization/file-diff');
const {getRepositoryByFile} = require('./visualization/git-utils');

class CodeRibbonManager {

  static deserialize(state, {
    deserializers,
    views
  }) {
    state.codeRibbonContainer = deserializers.deserialize(state.codeRibbonContainer);
    return new CodeRibbonManager(state, views);
  }

  // cons

  constructor(state, viewRegistry) {
    this.viewRegistry = viewRegistry;
    this.cr_primary_container = atom.workspace.getCenter().paneContainer;
    this.subscriptions = new CompositeDisposable();

    if (state.previousContainerSerializedRoot) {
      this.previousContainerSerializedRoot = state.previousContainerSerializedRoot;
      crdebug('Pre-CR container root available for restoration:', this.previousContainerSerializedRoot);
    } else {
      // capture the current workspace container root so we can put it back
      // after we deactivate or destroy
      this.previousContainerSerializedRoot = this.cr_primary_container.getRoot().serialize();
      crdebug(
        'Backed up current paneContainer to previousContainerSerializedRoot:',
        this.previousContainerSerializedRoot
      );
    }
    crdebug('Replacing container root with our new one!');
    this.cr_primary_container.getRoot().destroy();
    if (
      state.codeRibbonContainer &&
      state.codeRibbonContainer.__proto__.constructor.name == 'CodeRibbonRibbonContainer'
    ) {
      crdebug('CodeRibbonManager using codeRibbonContainer from previous state.');
      this.cr_primary_container.setRoot(state.codeRibbonContainer);
    } else {
      this.install_new_root_crrc();
    }
    this.cr_primary_container.getRoot().initialize();
    this.cr_primary_container.getElement().classList.add('cr-primary-container');

    // the command for overview mode:
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'code-ribbon:toggle-overview': () => this.cr_primary_container.getRoot().toggle_overview_mode()
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'code-ribbon:zoom-patch': () => this.cr_primary_container.getRoot().toggle_zoom_mode()
    }));

    this.subscriptions.add(atom.commands.add('atom-pane-axis.cr-vertical-strip', {
      'code-ribbon:add-patch-column-right': (dispatch_event) => {
        crdebug(dispatch_event);
        let crrc = this.cr_primary_container.getRoot()
        try {
          dispatch_event.stopImmediatePropagation();
          let position = crrc.children.indexOf(dispatch_event.currentTarget.model) + 1;
          // ensure the new column is visible
          // ensure the new column is visible
          let right_sibling_crsr = crrc.children[position];
          let right_focus_target = right_sibling_crsr.children[0];
          scrollPatchIntoView(right_focus_target, () => {
            // crdebug('Adding a CRSS from add-patch-column-right COMMAND');
            let n_crss = crrc.cr_add_strip(position);
            let n_p = n_crss.find_empty_patch();
            if (n_p) {
              // takes time for column to grow
              let te_cb = () => {
                n_crss.element.removeEventListener('transitionend', te_cb);
                n_p.smoothactivate();
              }
              n_crss.element.addEventListener('transitionend', te_cb);
            }
            global_cr_update(); // this will cause the transition
          });
          metrics.event({
            name: 'Add patch column right',
            type: 'interaction',
            location: crrc.children.indexOf(dispatch_event.currentTarget.model) + 1
          });
        } catch (err) {
          crlogger.error(err);
        }
      },
      'code-ribbon:add-patch-column-left': (dispatch_event) => {
        crdebug(dispatch_event);
        let crrc = this.cr_primary_container.getRoot();
        let crpc = get_cr_panecontainer();
        try {
          dispatch_event.stopImmediatePropagation();
          crpc.getElement().classList.add('cr-managed-scroll-active');
          let n_crss = crrc.cr_add_strip(
            crrc.children.indexOf(dispatch_event.currentTarget.model)
          );
          let n_p = n_crss.find_empty_patch();
          if (n_p) {
            // takes time for column to grow
            let te_cb = () => {
              n_crss.element.removeEventListener('transitionend', te_cb);
              n_p.smoothactivate(() => {
                crpc.getElement().classList.remove('cr-managed-scroll-active');
              });
            }
            n_crss.element.addEventListener('transitionend', te_cb);
          }
          global_cr_update(); // this will cause the transition
          metrics.event({
            name: 'Add patch column left',
            type: 'interaction',
            location: crrc.children.indexOf(dispatch_event.currentTarget.model)
          });
        } catch (err) {
          crlogger.error(err);
        }
      },
      'code-ribbon:close-patch-column': (dispatch_event) => {
        var crrc = this.cr_primary_container.getRoot()
        var closepromise = dispatch_event.currentTarget.model.close();
        // crdebug('Promise to close patch column:', closepromise);
        closepromise.then(() => {
          global_cr_update();
          metrics.event({
            name: 'Close patch column complete',
            type: 'followup'
          });
        });
        metrics.event({
          name: 'Close patch column begin',
          type: 'interaction',
          location: crrc.children.indexOf(dispatch_event.currentTarget.model)
        });
      },
    }));

    this.subscriptions.add(atom.commands.add('.tree-view .full-menu [is*="tree-view-"]', {
      'code-ribbon:network-graph': (dispatch_event) => {
        crdebug(dispatch_event);
        try {
          dispatch_event.stopImmediatePropagation();
          const repository = getRepositoryByFile(dispatch_event.currentTarget.getPath());
          this.addPatchWithGraph(this.cr_primary_container.getRoot(), 0, new NetworkGraph({repository}));
        } catch (err) {
          crlogger.error(err);
        }
      }
    }));

    this.subscriptions.add(atom.commands.add('atom-pane.cr-patch', {
      'code-ribbon:network-graph': (dispatch_event) => {
        crdebug(dispatch_event);
        try {
          const crrc = this.cr_primary_container.getRoot();
          dispatch_event.stopImmediatePropagation();
          const repository = getRepositoryByFile(dispatch_event.currentTarget.model.activeItem.buffer.file.path);
          const position = crrc.children.indexOf(dispatch_event.currentTarget.model.parent) + 1;
          this.addPatchWithGraph(crrc, position, new NetworkGraph({repository}));
        } catch (err) {
          crlogger.error(err);
        }
      }
    }));

    this.subscriptions.add(atom.commands.add('network-graph', {
      'code-ribbon:file-diff': (dispatch_event) => {
        crdebug(dispatch_event);
        try {
          dispatch_event.stopImmediatePropagation();
          let crrc = this.cr_primary_container.getRoot();
          let position = crrc.children.indexOf(dispatch_event.currentTarget.parentNode.parentNode.model.parent) + 1;
          // ensure the new column is visible
          let right_sibling_crsr = crrc.children[position];
          let right_focus_target = right_sibling_crsr.children[0];
          scrollPatchIntoView(right_focus_target, () => {
            // crdebug('Adding a new item from new-item COMMAND');
            crrc.cr_add_strip(position, [new CodeRibbonPatch({
              viewRegistry: this.viewRegistry,
              applicationDelegate: atom.applicationDelegate,
              config: atom.config,
              item: new FileDiff(dispatch_event.detail)
            }),]);
            global_cr_update(); // this will cause the transition
          });
          metrics.event({
            name: 'Add new file diff',
            type: 'interaction',
            location: position
          });
        } catch (err) {
          crlogger.error(err);
        }
      },
    }));

  }

  // Returns an object that can be retrieved when package is activated
  serialize() {
    return {
      deserializer: 'CodeRibbonManager',
      codeRibbonContainer: this.cr_primary_container.getRoot().serialize(),
      previousContainerSerializedRoot: this.previousContainerSerializedRoot
    };
  }

  cr_update() {
    (atom.devMode) ?
      this.cr_primary_container.getElement().classList.add('cr-dev-active')
      : this.cr_primary_container.getElement().classList.remove('cr-dev-active');

    if (
      this.cr_primary_container.getRoot().__proto__.constructor.name != 'CodeRibbonRibbonContainer'
    ) {
      crlogger.warn(
        'Current workspace root (',
        this.cr_primary_container.getRoot(),
        ') isn\'t a CodeRibbonRibbonContainer... replacing...'
      );
      var prevRoot = this.cr_primary_container.getRoot();
      this.install_new_root_crrc();
      prevRoot.destroy();
    }
    this.cr_primary_container.getRoot().cr_update();
  }

  install_new_root_crrc() {
    crdebug('CodeRibbonManager creating a new CodeRibbonRibbonContainer...');
    var n_crrc = new CodeRibbonRibbonContainer({
      orientation: null,
      /**
       * since this is a brand new CodeRibbonRibbonContainer,
       * the init should auto-populate some new Ribbons for us
       * according to the config
       */
      children: null,
      flexScale: null
    }, this.viewRegistry);
    this.cr_primary_container.setRoot(n_crrc);
  }

  // Tear down any state and detach
  destroy() {
    crdebug('CodeRibbonManager destroy()');
    this.subscriptions.dispose();
    this.cr_primary_container.getRoot().destroy();
    var previousContainerRoot = atom.deserializers.deserialize(this.previousContainerSerializedRoot);
    this.cr_primary_container.setRoot(previousContainerRoot);
    this.previousContainerSerializedRoot = null;
    metrics.event({
      name: 'CodeRibbonManager destroy()',
      type: 'system'
    });
  }

  addPatchWithGraph(crrc, position, item) {
    let sibling_crsr = crrc.children[position];
    let focus_target = sibling_crsr.children[0];
    if (position === 0 && focus_target.parent.isVisible()) {
      position += 1;
      sibling_crsr = crrc.children[position];
      focus_target = sibling_crsr.children[0];
    }
    scrollPatchIntoView(focus_target, () => {
      crrc.cr_add_strip(position, [new CodeRibbonPatch({
        viewRegistry: this.viewRegistry,
        applicationDelegate: atom.applicationDelegate,
        config: atom.config,
        item
      }),]);
      global_cr_update(); // this will cause the transition
    });
    metrics.event({
      name: 'Add new item',
      type: 'interaction',
      location: position
    });
  }

}

module.exports = CodeRibbonManager;
