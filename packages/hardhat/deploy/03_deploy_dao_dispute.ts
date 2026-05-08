import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const marketplace = await hre.deployments.get("JobMarketplace");
  const reputationSystem = await hre.deployments.get("ReputationSystem");
  const decentraToken = await hre.deployments.get("DecentraToken");

  const SEVEN_DAYS = 7 * 24 * 60 * 60;

  await deploy("DAODispute", {
    from: deployer,
    args: [
      deployer, // defaultAdmin
      marketplace.address, // jobMarketplace
      reputationSystem.address, // reputationSystem
      decentraToken.address, // decentraToken
      deployer, // treasury (update before mainnet)
      SEVEN_DAYS, // votingDuration
      3, // minimumVoters (quorum)
      8000, // voterRewardBps = 80% of stake to majority
      10, // minorityReputationPenalty
      hre.ethers.parseEther("10"), // minimumTokensToVote (10 DWT)
    ],
    log: true,
    autoMine: true,
  });

  const daoDispute = await hre.ethers.getContract<Contract>("DAODispute", deployer);
  const marketplaceCtx = await hre.ethers.getContract<Contract>("JobMarketplace", deployer);
  const repSystem = await hre.ethers.getContract<Contract>("ReputationSystem", deployer);

  const DAO_EXECUTOR_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("DAO_EXECUTOR_ROLE"));
  const MARKETPLACE_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("MARKETPLACE_ROLE"));
  const DAO_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("DAO_ROLE"));

  const daoAddress = await daoDispute.getAddress();

  // Allow DAODispute to call executeDaoOutcome on JobMarketplace
  const gas1 = await marketplaceCtx.grantRole.estimateGas(DAO_EXECUTOR_ROLE, daoAddress);
  await marketplaceCtx.grantRole(DAO_EXECUTOR_ROLE, daoAddress, { gasLimit: (gas1 * 120n) / 100n });
  console.log("  ✓ JobMarketplace: DAO_EXECUTOR_ROLE → DAODispute");

  // Allow JobMarketplace to call initiateDispute on DAODispute
  const marketplaceAddress = await marketplaceCtx.getAddress();
  const gas2 = await daoDispute.grantRole.estimateGas(MARKETPLACE_ROLE, marketplaceAddress);
  await daoDispute.grantRole(MARKETPLACE_ROLE, marketplaceAddress, { gasLimit: (gas2 * 120n) / 100n });
  console.log("  ✓ DAODispute: MARKETPLACE_ROLE → JobMarketplace");

  // Allow DAODispute to penalize minority voters via ReputationSystem
  const gas3 = await repSystem.grantRole.estimateGas(DAO_ROLE, daoAddress);
  await repSystem.grantRole(DAO_ROLE, daoAddress, { gasLimit: (gas3 * 120n) / 100n });
  console.log("  ✓ ReputationSystem: DAO_ROLE → DAODispute");

  // Wire DAODispute address into JobMarketplace
  const gas4 = await marketplaceCtx.setDAODispute.estimateGas(daoAddress);
  await marketplaceCtx.setDAODispute(daoAddress, { gasLimit: (gas4 * 120n) / 100n });
  console.log("  ✓ JobMarketplace: daoDispute set");

  console.log("✅ DAODispute deployed and wired");
};

export default deploy;
deploy.tags = ["DAODispute"];
deploy.dependencies = ["JobMarketplace", "ReputationSystem", "DecentraToken"];
