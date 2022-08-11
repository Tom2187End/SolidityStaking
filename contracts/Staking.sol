pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

interface TestToken {
    function balanceOf(address) external view returns (uint256);
    function transferFrom(address, address, uint256) external returns (bool);
}
contract Staking is Ownable {
    address private TOKEN;
    address private store;

    uint256 public UNSTAKEABLE_FEE = 9200;
    uint256 public MINIMUM_CONTRIBUTION_AMOUNT = 5;
    uint256 public REWARD_PERCENT = 50;

    string private constant MINIMUM_CONTRIBUTION_ERROR = "Contributions must be over the minimum contribution amount";
    string private constant NEVER_CONTRIBUTED_ERROR = "This address has never contributed BNB to the protocol";

    struct Staker {
      address addr;
      uint256 lifetime_contribution;
      uint256 contribution;
      uint256 yield;
      uint256 last_yield_time;
      uint256 unstakeable;
      uint256 joined;
      bool exists;
    }

    mapping(address => Staker) public stakers;
    address[] public stakerList;

    constructor(address tkAddress, address st) {
      store = st;
      TOKEN = tkAddress;
    }

    function AddStakerYield(address addr) private {
      uint256 reward = (block.timestamp - stakers[addr].last_yield_time) / (60*60*24) * (stakers[addr].lifetime_contribution * REWARD_PERCENT) / 10000;
      stakers[addr].yield = stakers[addr].yield + reward;
      TestToken(TOKEN).transferFrom(store, addr, reward);
      stakers[addr].last_yield_time = block.timestamp;
    }

    function ChangeMinimumStakingAmount(uint256 a) external onlyOwner {
        MINIMUM_CONTRIBUTION_AMOUNT = a;
    }

    function ChangeUnstakeableFee(uint256 a) external onlyOwner {
        UNSTAKEABLE_FEE = a;
    }

    function UnstakeAll() external onlyOwner {
        for (uint i = 0; i < stakerList.length; i++) {
            address user = stakerList[i];
            ForceRemoveStake(user);
        }
    }

    function Stake(uint256 value) external returns (uint256) {
      require(value >= MINIMUM_CONTRIBUTION_AMOUNT, MINIMUM_CONTRIBUTION_ERROR);
      uint256 bnb = value;
      uint256 unstakeable = (bnb * UNSTAKEABLE_FEE) / 10000;

      if(StakerExists(msg.sender)){
        AddStakerYield(msg.sender);
        stakers[msg.sender].lifetime_contribution = stakers[msg.sender].lifetime_contribution + bnb;
        stakers[msg.sender].contribution = stakers[msg.sender].contribution + unstakeable;
        stakers[msg.sender].unstakeable = stakers[msg.sender].unstakeable + unstakeable;
      }else{
        Staker memory user;
        user.addr = msg.sender;
        user.contribution = unstakeable;
        user.lifetime_contribution = bnb;
        user.yield = 0;
        user.exists = true;
        user.unstakeable = unstakeable;
        user.joined = block.timestamp;
        user.last_yield_time = block.timestamp;
        stakers[msg.sender] = user;
        stakerList.push(msg.sender);
      }
      // console.log("stake", msg.sender, store);
      TestToken(TOKEN).transferFrom(msg.sender, store, bnb);

      uint256 c = (10000 - UNSTAKEABLE_FEE);
      uint256 fee = (bnb * c) / 10000;
      return fee;
    }

    function RemoveStake() external {
      address user = msg.sender;
      if(!StakerExists(user)){ revert(NEVER_CONTRIBUTED_ERROR); }
      uint256 uns = stakers[user].unstakeable;
      if(uns == 0){ revert("This user has nothing to withdraw from the protocol"); }
      // AddStakerYield(msg.sender);
      TestToken(TOKEN).transferFrom(store, user, stakers[user].unstakeable);
      stakers[user].unstakeable = 0;
      stakers[user].contribution = 0;
    }

    function ForceRemoveStake(address user) private {
      if(!StakerExists(user)){ revert(NEVER_CONTRIBUTED_ERROR); }
      uint256 uns = stakers[user].unstakeable;
      if(uns == 0){ revert("This user has nothing to withdraw from the protocol"); }

      TestToken(TOKEN).transferFrom(user, store, stakers[user].unstakeable);
      stakers[user].unstakeable = 0;
      stakers[user].contribution = 0;
    }

    function StakerExists(address a) public view returns(bool){
      return stakers[a].exists;
    }

    function StakerCount() public view returns(uint256){
      return stakerList.length;
    }

    function GetStakeJoinDate(address a) public view returns(uint256){
      if(!StakerExists(a)){revert(NEVER_CONTRIBUTED_ERROR);}
      return stakers[a].joined;
    }

    function GetStakerYield(address a) public view returns(uint256){
      if(!StakerExists(a)){revert(NEVER_CONTRIBUTED_ERROR);}
      return stakers[a].yield;
    }
  
    function GetStakingAmount(address a) public view returns (uint256){
      if(!StakerExists(a)){revert(NEVER_CONTRIBUTED_ERROR);}
      return stakers[a].contribution;
    }

    function GetStakerUnstakeableAmount(address addr) public view returns(uint256) {
      if(StakerExists(addr)){ return stakers[addr].unstakeable; }else{ return 0; }
    }

    function GetLifetimeContributionAmount(address a) public view returns (uint256){
      if(!StakerExists(a)){revert("This address has never contributed DAI to the protocol");}
      return stakers[a].lifetime_contribution;
    }
}