"use client";

import type { ComponentProps } from "react";
import { SimpleCanvas } from "@/components/SimpleCanvas";
import { CANONICAL_WHITEBOARD_ARCHITECTURE } from "@/lib/whiteboard-architecture";
import { LayeredBoard } from "@/components/classroom-whiteboard/LayeredBoard";
import type { TutorAction } from "@/lib/classroom-v2";

type LegacyProps = ComponentProps<typeof SimpleCanvas> & {
  renderMode?: "legacy";
};

type LayeredProps = {
  renderMode: "layered-v2";
  tutorActions: TutorAction[];
  studentInputEnabled: boolean;
  title?: string;
  subtitle?: string;
  ownershipLabel?: string;
  surfaceFocusLabel?: string;
  surfaceFocusDetail?: string;
  emphasisTone?: ComponentProps<typeof LayeredBoard>["emphasisTone"];
  teacherRevealProgress?: number;
  activeRevealActionIndex?: number | null;
  teacherMotionEnabled?: boolean;
  teacherHoldActive?: boolean;
  teacherHoldStrength?: number;
  reviewHandoffActive?: boolean;
  reviewHandoffLabel?: string;
  reviewHandoffDetail?: string;
  reviewHandoffProgress?: number;
  lessonCloseActive?: boolean;
  lessonCloseLabel?: string;
  lessonCloseDetail?: string;
  lessonCloseProgress?: number;
  onStudentSubmit?: ComponentProps<typeof LayeredBoard>["onStudentSubmit"];
};

type Props = LegacyProps | LayeredProps;

/**
 * Canonical whiteboard boundary for Classroom V2.
 * Legacy classroom behavior stays intact, while V2 slices can land here without reopening the boundary decision.
 */
export function CanonicalWhiteboard(props: Props) {
  return (
    <div
      className="h-full"
      data-whiteboard-architecture={CANONICAL_WHITEBOARD_ARCHITECTURE.id}
      data-whiteboard-status={CANONICAL_WHITEBOARD_ARCHITECTURE.status}
    >
      {props.renderMode === "layered-v2" ? (
        <LayeredBoard
          actions={props.tutorActions}
          studentInputEnabled={props.studentInputEnabled}
          title={props.title}
          subtitle={props.subtitle}
          ownershipLabel={props.ownershipLabel}
          surfaceFocusLabel={props.surfaceFocusLabel}
          surfaceFocusDetail={props.surfaceFocusDetail}
          emphasisTone={props.emphasisTone}
          teacherRevealProgress={props.teacherRevealProgress}
          activeRevealActionIndex={props.activeRevealActionIndex}
          teacherMotionEnabled={props.teacherMotionEnabled}
          teacherHoldActive={props.teacherHoldActive}
          teacherHoldStrength={props.teacherHoldStrength}
          reviewHandoffActive={props.reviewHandoffActive}
          reviewHandoffLabel={props.reviewHandoffLabel}
          reviewHandoffDetail={props.reviewHandoffDetail}
          reviewHandoffProgress={props.reviewHandoffProgress}
          lessonCloseActive={props.lessonCloseActive}
          lessonCloseLabel={props.lessonCloseLabel}
          lessonCloseDetail={props.lessonCloseDetail}
          lessonCloseProgress={props.lessonCloseProgress}
          onStudentSubmit={props.onStudentSubmit}
        />
      ) : (
        <SimpleCanvas {...props} />
      )}
    </div>
  );
}
