'use client';

import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useState } from "react";
import { type CompanyUserMini } from '@/lib/validation/companyUserMiniSchema';

export default function Page() {

  const [user, setUser] = useState<CompanyUserMini | undefined>(undefined);
  const { companyId, userId } = useParams<{ companyId: string; userId: string }>();
  const t = useTranslations();


    return (
      <div className="p-10 text-neutral-500">
        <h1>{t('companies.users.edit.title')}</h1>

      </div>
    );
  }
  