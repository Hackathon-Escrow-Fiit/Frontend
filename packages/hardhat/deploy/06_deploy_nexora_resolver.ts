import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { namehash } from "viem/ens";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, get } = hre.deployments;

  const reputationSystem = await get("ReputationSystem");
  const registry = await get("DecentraWorkRegistry");

  // Deploy the resolver, pointing it at existing contracts
  const resolverDeployment = await deploy("NexoraResolver", {
    from: deployer,
    args: [reputationSystem.address, registry.address],
    log: true,
    autoMine: true,
  });

  console.log("✅ NexoraResolver deployed at:", resolverDeployment.address);

  // Compute the ENS namehash of "nexora.eth" — deterministic, no ENS infra needed
  const nexoraEthNode = namehash("nexora.eth");
  console.log("📛 nexora.eth namehash:", nexoraEthNode);

  // Wire the resolver into the registry
  const registryContract = await hre.ethers.getContractAt("DecentraWorkRegistry", registry.address);
  const gas = await registryContract.setResolver.estimateGas(resolverDeployment.address, nexoraEthNode);
  const tx = await registryContract.setResolver(resolverDeployment.address, nexoraEthNode, {
    gasLimit: (gas * 120n) / 100n,
  });
  await tx.wait();

  console.log("🔗 Registry linked to NexoraResolver");
  console.log("   Resolver:", resolverDeployment.address);
  console.log("   nexora.eth node:", nexoraEthNode);
  console.log("");
  console.log("   Any name registered from now on will have ENS text records:");
  console.log("   decentrawork.elo, decentrawork.tier, decentrawork.role, decentrawork.bio, url");
};

export default deploy;
deploy.tags = ["NexoraResolver"];
deploy.dependencies = ["ReputationSystem", "DecentraWorkRegistry"];
