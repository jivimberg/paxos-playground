import Node, {allRoles} from "../../main/js/paxos/Node";
import Cluster from "../../main/js/paxos/Cluster";

const assert = require('assert');

describe('Single decree paxos', () => {
	describe('A paxos instance in a 3 node cluster', function () {
		beforeEach(function () {
			this.node0 = new Node(0, allRoles);
			this.node1 = new Node(1, allRoles);
			this.node2 = new Node(2, allRoles);

			this.cluster = new Cluster([
				this.node0,
				this.node1,
				this.node2
			]);

			this.node0.setup(this.cluster);
			this.node0.start();

			this.node1.setup(this.cluster);
			this.node1.start();

			this.node2.setup(this.cluster);
			this.node2.start();
		});

		it('Should agree on a given value', function () {
			const proposer = this.cluster.proposers[0];
			const value = "some value";
			proposer.prepareValue(value);

			this.cluster.learners.forEach((node) => {
				assert.equal(value, node._learner._finalValue)
			})
		});

		it('Should agree on a given value even with only 2 nodes up', function () {
			this.node2.stop();

			const proposer = this.cluster.proposers[0];
			const value = "some value";
			proposer.prepareValue(value);

			assert.equal(value, this.cluster.learners[0]._learner._finalValue)
			assert.equal(value, this.cluster.learners[1]._learner._finalValue)
			assert.equal(undefined, this.cluster.learners[2]._learner._finalValue)

		});

		it('Should not be able to agree on value with only 1 node up', function () {
			this.node1.stop();
			this.node2.stop();

			const proposer = this.cluster.proposers[0];
			const value = "some value";
			proposer.prepareValue(value);

			this.cluster.learners.forEach((node) => {
				assert.equal(undefined, node._learner._finalValue)
			})
		})
	});
});