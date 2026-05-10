"use client";

import { useParams } from "next/navigation";
import { DefenseView } from "../_components/DefenseView";
import { DisputeHeader, useDisputeData } from "../_components/shared";
import { useAccount } from "wagmi";
import { AppLayout } from "~~/components/decentrawork/AppLayout";

export default function DefensePage() {
  const { id } = useParams<{ id: string }>();
  const { address } = useAccount();
  const { job, dispute } = useDisputeData(id);
  const isFreelancer = !!(address && job && job.freelancer.toLowerCase() === address.toLowerCase());

  return (
    <AppLayout>
      <div className="px-6 py-8 w-full">
        <DisputeHeader
          id={id}
          view="defense"
          job={job}
          dispute={dispute}
          isFreelancer={isFreelancer}
          onScrollToDefense={() => document.getElementById("defense-form")?.scrollIntoView({ behavior: "smooth" })}
        />
        <DefenseView id={id} job={job} dispute={dispute} address={address} />
      </div>
    </AppLayout>
  );
}
