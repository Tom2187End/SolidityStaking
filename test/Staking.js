// This is an example test file. Hardhat will run every *.js file in `test/`,
// so feel free to add new ones.

// Hardhat tests are normally written with Mocha and Chai.

// We import Chai to use its asserting functions here.
const { expect } = require("chai");

// We use `loadFixture` to share common setups (or fixtures) between tests.
// Using this simplifies your tests and makes them run faster, by taking
// advantage of Hardhat Network's snapshot functionality.
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

// `describe` is a Mocha function that allows you to organize your tests.
// Having your tests organized makes debugging them easier. All Mocha
// functions are available in the global scope.
//
// `describe` receives the name of a section of your test suite, and a
// callback. The callback must define the tests of that section. This callback
// can't be an async function.

describe("Staking contract", function () {
    const UNSTAKEABLE_FEE = 9200;
    const MINIMUM_CONTRIBUTION_AMOUNT = 5;
    const REWARD_PERCENT = 50;
    const MINIMUM_CONTRIBUTION_ERROR = "Contributions must be over the minimum contribution amount";
    const NEVER_CONTRIBUTED_ERROR = "This address has never contributed BNB to the protocol";
  // We define a fixture to reuse the same setup in every test. We use
  // loadFixture to run this setup once, snapshot that state, and reset Hardhat
  // Network to that snapshopt in every test.
  async function deployStakingContractFixture() {
    // Get the ContractFactory and Signers here.
    const [owner, addr1, addr2, store] = await ethers.getSigners();
    
    const Token = await ethers.getContractFactory("MyToken");
    const token = await Token.deploy();
    await token.deployed();
    const Staking = await ethers.getContractFactory("Staking");
    
    // To deploy our contract, we just have to call Token.deploy() and await
    // its deployed() method, which happens onces its transaction has been
    // mined.
    const staking = await Staking.deploy(token.address, store.address, {
        gasLimit: 10000000
    });
    await staking.deployed();

    // Fixtures can return anything you consider useful for your tests
    return { token, staking, owner, addr1, addr2, store };
  }

  function getStaker(staker) {
    return {
        addr: staker.addr,
        lifetime_contribution: parseInt(ethers.utils.formatUnits(staker.lifetime_contribution, 0)),
        contribution: parseInt(ethers.utils.formatUnits(staker.contribution, 0)),
        yield: parseInt(ethers.utils.formatUnits(staker.yield, 0)),
        unstakeable: parseInt(ethers.utils.formatUnits(staker.unstakeable, 0)),
        exists: staker.exists
    }
  }
  // You can nest describe calls to create subsections.
  describe("Deployment", function () {
    // `it` is another Mocha function. This is the one you use to define each
    // of your tests. It receives the test name, and a callback function.
    //
    // If the callback function is async, Mocha will `await` it.
    it("Should set the right owner", async function () {
      // We use loadFixture to setup our environment, and then assert that
      // things went well
      const { staking, owner } = await loadFixture(deployStakingContractFixture);

      // `expect` receives a value and wraps it in an assertion object. These
      // objects have a lot of utility methods to assert values.

      // This test expects the owner variable stored in the contract to be
      // equal to our Signer's owner.
      expect(await staking.owner()).to.equal(owner.address);
    });
  });
  describe("Staking", function() {
    it("user stakes 100 tokens", async function() {
        const { token, staking, addr1, store, owner } = await loadFixture(deployStakingContractFixture);
        // const joined = Math.floor(Date.now() / 1000);
        await token.transfer(addr1.address, 200);
        await token.connect(addr1).approve(staking.address, 100);
        await token.connect(addr1).approve(store.address, 100);
        await staking.connect(addr1).Stake(100);
        expect(await token.balanceOf(store.address)).to.equal(100);
        const unstakeable = (100 * UNSTAKEABLE_FEE) / 10000;
        expect(getStaker(await staking.stakers(addr1.address))).to.deep.equal({
            addr: addr1.address,
            contribution: unstakeable,
            lifetime_contribution: 100,
            yield: 0,
            exists: true,
            unstakeable
        });
    })
    it("user tries to stake less than minimum contribution amount", async function() {
        const { staking, addr1 } = await loadFixture(deployStakingContractFixture);
        await expect(staking.connect(addr1).Stake(2)).to.be.revertedWith(MINIMUM_CONTRIBUTION_ERROR);
    })
    it("staker exists", async function() {
        const { token, staking, addr1, store } = await loadFixture(deployStakingContractFixture);
        token.transfer(addr1.address, 100);
        await token.connect(addr1).approve(staking.address, 100);
        await token.connect(addr1).approve(store.address, 100);
        await staking.connect(addr1).Stake(100);
        const staker = await staking.stakers(addr1.address);
        expect(staker.exists).to.equal(true);
    })
    it("staker count", async function() {
        const { token, staking, addr1, addr2, store } = await loadFixture(deployStakingContractFixture);
        token.transfer(addr1.address, 100);
        token.transfer(addr2.address, 200);
        token.connect(addr1).approve(staking.address, 100);
        token.connect(addr1).approve(store.address, 100);
        token.connect(addr2).approve(staking.address, 200);
        token.connect(addr2).approve(store.address, 200);
        await staking.connect(addr1).Stake(100);
        await staking.connect(addr2).Stake(200);
        expect(await staking.StakerCount()).to.equal(2);
    })
  })
  describe("Unstaking", function() {
    it("non-staked user tries to unstake", async function() {
        const { staking, addr1 } = await loadFixture(deployStakingContractFixture);
        await expect(staking.connect(addr1).RemoveStake()).to.be.revertedWith(NEVER_CONTRIBUTED_ERROR);
    })
    it("user unstakes", async function() {
        const { token, staking, addr1, store } = await loadFixture(deployStakingContractFixture);
        await token.transfer(addr1.address, 200);
        await token.connect(addr1).approve(staking.address, 100);
        await token.connect(addr1).approve(store.address, 100);
        await staking.connect(addr1).Stake(100);
        await token.connect(store).approve(staking.address, 100);
        await token.connect(store).approve(addr1.address, 100);
        await staking.connect(addr1).RemoveStake();
        expect(getStaker(await staking.stakers(addr1.address))).to.deep.include({
            unstakeable: 0,
            contribution: 0
        })
    })
  })
});