import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const decentraToken = await hre.deployments.get("DecentraToken");

  await deploy("TokenSale", {
    from: deployer,
    args: [
      decentraToken.address,
      deployer,
      2500, // 1 ETH = 2500 NXR
    ],
    log: true,
    autoMine: true,
  });

  const tokenSale = await hre.ethers.getContract<Contract>("TokenSale", deployer);
  const token = await hre.ethers.getContract<Contract>("DecentraToken", deployer);

  const MINTER_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("MINTER_ROLE"));
  const gas = await token.grantRole.estimateGas(MINTER_ROLE, await tokenSale.getAddress());
  await token.grantRole(MINTER_ROLE, await tokenSale.getAddress(), { gasLimit: (gas * 120n) / 100n });
  console.log("  ✓ DecentraToken: MINTER_ROLE → TokenSale");

  console.log("✅ TokenSale deployed (1 ETH = 2500 NXR)");
};

export default deploy;
deploy.tags = ["TokenSale"];
deploy.dependencies = ["DecentraToken"];
