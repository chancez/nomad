import Component from '@ember/component';
import { tagName } from '@ember-decorators/component';
import { task } from 'ember-concurrency';
import EmberObject, { action, computed } from '@ember/object';
import { alias } from '@ember/object/computed';
import { inject as service } from '@ember/service';
import { run } from '@ember/runloop';
import Searchable from 'nomad-ui/mixins/searchable';
import classic from 'ember-classic-decorator';

@tagName('')
export default class GlobalSearchControl extends Component {
  @service router;
  @service store;

  searchString = null;

  constructor() {
    super(...arguments);

    this.jobSearch = JobSearch.create({
      something: this, // FIXME what’s a good name?
    });

    this.nodeSearch = NodeSearch.create({
      something: this,
    });
  }

  @task(function*(string) {
    this.searchString = string;

    // FIXME no need to fetch on every search!
    const jobs = yield this.store.findAll('job');
    const nodes = yield this.store.findAll('node');

    this.jobs = jobs.toArray();
    this.nodes = nodes.toArray();

    try {
      const jobResults = this.jobSearch.listSearched;
      const nodeResults = this.nodeSearch.listSearched;

      return [
        {
          groupName: `Jobs (${jobResults.length})`,
          options: jobResults,
        },
        {
          groupName: `Clients (${nodeResults.length})`,
          options: nodeResults,
        },
      ];
    } catch (e) {
      // eslint-disable-next-line
      console.log('exception searching', e);
    }
  })
  search;

  @action
  open() {
    if (this.select) {
      this.select.actions.open();
    }
  }

  @action
  selectOption(model) {
    const itemModelName = model.constructor.modelName;

    if (itemModelName === 'job') {
      this.router.transitionTo('jobs.job', model.name);
    } else if (itemModelName === 'node') {
      this.router.transitionTo('clients.client', model.id);
    }
  }

  @action
  storeSelect(select) {
    if (select) {
      this.select = select;
    }
  }

  @action
  openOnClickOrTab(select, { target }) {
    // Bypass having to press enter to access search after clicking/tabbing
    const targetClassList = target.classList;
    const targetIsTrigger = targetClassList.contains('ember-power-select-trigger');

    // Allow tabbing out of search
    const triggerIsNotActive = !targetClassList.contains('ember-power-select-trigger--active');

    if (targetIsTrigger && triggerIsNotActive) {
      run.next(() => {
        select.actions.open();
      });
    }
  }

  calculatePosition(trigger) {
    const { top, left, width } = trigger.getBoundingClientRect();
    return {
      style: {
        left,
        width,
        top,
      },
    };
  }
}

@classic
class JobSearch extends EmberObject.extend(Searchable) {
  @computed
  get searchProps() {
    return ['id', 'name'];
  }

  @computed
  get fuzzySearchProps() {
    return ['name'];
  }

  @alias('something.jobs') listToSearch;
  @alias('something.searchString') searchTerm;

  fuzzySearchEnabled = true;
}

@classic
class NodeSearch extends EmberObject.extend(Searchable) {
  @computed
  get searchProps() {
    return ['id', 'name'];
  }

  @computed
  get fuzzySearchProps() {
    return ['name'];
  }

  @alias('something.nodes') listToSearch;
  @alias('something.searchString') searchTerm;

  fuzzySearchEnabled = true;
}
