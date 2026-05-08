import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const reputationSystem = await hre.deployments.get("ReputationSystem");
  const decentraToken    = await hre.deployments.get("DecentraToken");

  // Use env var for AI oracle on live networks; fall back to deployer on localhost
  const aiOracle = process.env.AI_ORACLE_ADDRESS || deployer;

  await deploy("JobMarketplace", {
    from: deployer,
    args: [
      deployer,              // defaultAdmin
      aiOracle,              // aiOracle
      reputationSystem.address,
      decentraToken.address,
      deployer,              // feeRecipient (update before mainnet)
      250,                   // platformFeeBps = 2.5%
    ],
    log: true,
    autoMine: true,
  });

  const marketplace = await hre.ethers.getContract<Contract>("JobMarketplace", deployer);
  const repSystem   = await hre.ethers.getContract<Contract>("ReputationSystem", deployer);
  const token       = await hre.ethers.getContract<Contract>("DecentraToken", deployer);

  const MARKETPLACE_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("MARKETPLACE_ROLE"));
  const AI_ORACLE_ROLE   = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("AI_ORACLE_ROLE"));
  const MINTER_ROLE      = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("MINTER_ROLE"));

  // Grant ReputationSystem permissions to JobMarketplace
  const gas1 = await repSystem.grantRole.estimateGas(MARKETPLACE_ROLE, await marketplace.getAddress());
  await repSystem.grantRole(MARKETPLACE_ROLE, await marketplace.getAddress(), { gasLimit: (gas1 * 120n) / 100n });
  console.log("  ✓ ReputationSystem: MARKETPLACE_ROLE → JobMarketplace");

  // Grant AI oracle the AI_ORACLE_ROLE on ReputationSystem (for setSkill)
  const gas2 = await repSystem.grantRole.estimateGas(AI_ORACLE_ROLE, aiOracle);
  await repSystem.grantRole(AI_ORACLE_ROLE, aiOracle, { gasLimit: (gas2 * 120n) / 100n });
  console.log("  ✓ ReputationSystem: AI_ORACLE_ROLE → aiOracle");

  // Grant JobMarketplace MINTER_ROLE on DecentraToken
  const gas3 = await token.grantRole.estimateGas(MINTER_ROLE, await marketplace.getAddress());
  await token.grantRole(MINTER_ROLE, await marketplace.getAddress(), { gasLimit: (gas3 * 120n) / 100n });
  console.log("  ✓ DecentraToken: MINTER_ROLE → JobMarketplace");

  console.log("✅ JobMarketplace deployed and wired");
};

export default deploy;
deploy.tags = ["JobMarketplace"];
deploy.dependencies = ["DecentraToken", "ReputationSystem"];
