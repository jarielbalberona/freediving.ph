package service

import (
	"strings"
)

type feedPresentation struct {
	TypeLabel string
	TypeHint  string
	RankLabel string
	RankHint  string
	Tone      string
}

type modeFrame struct {
	Greeting    string
	Message     string
	SafetyBadge string
}

func presentationFor(mode Mode, itemType ItemType, reasons []string) feedPresentation {
	rankLabel := "Worth a look"
	rankHint := "Relevant activity for this feed right now."
	for _, reason := range reasons {
		switch strings.TrimSpace(reason) {
		case "following":
			rankLabel = "From your network"
			rankHint = "People and conversations closest to your graph are pushed up."
		case "nearby", "nearby_spot":
			rankLabel = "Near your area"
			rankHint = "Local activity is prioritized because it can turn into a real dive."
		case "training_affinity":
			rankLabel = "Training-focused"
			rankHint = "This helps the training lane stay practical instead of noisy."
		case "spot_reports":
			rankLabel = "Fresh spot intel"
			rankHint = "Operational reports and site updates outrank generic chatter here."
		case "buddy_activity":
			rankLabel = "Actionable now"
			rankHint = "Buddy coordination is prioritized because it creates real sessions."
		case "event_activity":
			rankLabel = "Group momentum"
			rankHint = "This event is active enough to matter right now."
		case "community_heat":
			rankLabel = "Active discussion"
			rankHint = "This thread is moving, not sitting dead in the water."
		case "saved_spot_related":
			rankLabel = "Related to saved places"
			rankHint = "Your saved places are influencing what surfaces here."
		}
	}

	switch itemType {
	case ItemTypePost:
		return feedPresentation{
			TypeLabel: "Dive update",
			TypeHint:  "Social post from the water or after a session.",
			RankLabel: rankLabel,
			RankHint:  rankHint,
			Tone:      "social",
		}
	case ItemTypeMediaPost:
		return feedPresentation{
			TypeLabel: "Photo post",
			TypeHint:  "Visual post from a dive day, session, or site visit.",
			RankLabel: rankLabel,
			RankHint:  rankHint,
			Tone:      "social",
		}
	case ItemTypeCommunityHot:
		return feedPresentation{
			TypeLabel: "Community thread",
			TypeHint:  "Discussion with visible reply and reaction momentum.",
			RankLabel: rankLabel,
			RankHint:  rankHint,
			Tone:      "social",
		}
	case ItemTypeDiveSpot:
		return feedPresentation{
			TypeLabel: "Spot briefing",
			TypeHint:  "Place-level context that helps a diver decide where to go.",
			RankLabel: rankLabel,
			RankHint:  rankHint,
			Tone:      "conditions",
		}
	case ItemTypeEvent:
		return feedPresentation{
			TypeLabel: "Group session",
			TypeHint:  "An event or meetup that can pull people into the water together.",
			RankLabel: rankLabel,
			RankHint:  rankHint,
			Tone:      "coordination",
		}
	case ItemTypeBuddySignal:
		return feedPresentation{
			TypeLabel: "Buddy call",
			TypeHint:  "A direct coordination signal from someone looking to dive.",
			RankLabel: rankLabel,
			RankHint:  rankHint,
			Tone:      "coordination",
		}
	default:
		return feedPresentation{
			TypeLabel: "Record highlight",
			TypeHint:  "Milestone content worth noticing, but not the core of the feed.",
			RankLabel: rankLabel,
			RankHint:  rankHint,
			Tone:      "milestone",
		}
	}
}

func profileHref(username string) string {
	trimmed := strings.TrimSpace(username)
	if trimmed == "" {
		return ""
	}
	return "/" + strings.ToLower(trimmed)
}

func eventHref(id string) string {
	if strings.TrimSpace(id) == "" {
		return ""
	}
	return "/events/" + strings.TrimSpace(id)
}

func buddyHref(id string) string {
	if strings.TrimSpace(id) == "" {
		return ""
	}
	return "/buddy/" + strings.TrimSpace(id)
}

func chikaHref(id string) string {
	if strings.TrimSpace(id) == "" {
		return ""
	}
	return "/chika/" + strings.TrimSpace(id)
}

func diveSiteHref(slug string) string {
	if strings.TrimSpace(slug) == "" {
		return ""
	}
	return "/explore/sites/" + strings.TrimSpace(slug)
}

func contextForMode(mode Mode, isGuest bool) modeFrame {
	if isGuest {
		return modeFrame{
			Greeting:    "Freediving community pulse",
			Message:     "This preview shows live activity, local water context, and buddy coordination. Sign in to unlock the full feed.",
			SafetyBadge: "Buddy-first diving",
		}
	}

	switch mode {
	case ModeNearby:
		return modeFrame{
			Greeting:    "Local water, local people, local decisions",
			Message:     "Nearby prioritizes what can turn into a dive soon: buddy calls, fresh reports, and active local posts.",
			SafetyBadge: "Local conditions first",
		}
	case ModeTraining:
		return modeFrame{
			Greeting:    "Training is the discipline lane",
			Message:     "Training strips out fluff and pushes progress logs, session plans, and useful signals higher.",
			SafetyBadge: "Progress over noise",
		}
	case ModeSpotReports:
		return modeFrame{
			Greeting:    "Spot reports should help you decide, not just browse",
			Message:     "This mode favors fresh operational intel, site activity, and buddy coordination around real places.",
			SafetyBadge: "Fresh spot intel",
		}
	default:
		return modeFrame{
			Greeting:    "Your feed should lead to real dives",
			Message:     "Following favors people, plans, and local momentum over decorative discovery cards.",
			SafetyBadge: "People before catalog",
		}
	}
}

func quickActionsForMode(mode Mode) []QuickAction {
	switch mode {
	case ModeNearby:
		return []QuickAction{
			{Type: "find_buddy", Label: "Find buddy"},
			{Type: "report_conditions", Label: "Report conditions"},
			{Type: "explore_spots", Label: "Nearby spots"},
			{Type: "join_event", Label: "See sessions"},
		}
	case ModeTraining:
		return []QuickAction{
			{Type: "log_training", Label: "Log training"},
			{Type: "share_progress", Label: "Share progress"},
			{Type: "find_buddy", Label: "Find buddy"},
			{Type: "join_event", Label: "See events"},
		}
	case ModeSpotReports:
		return []QuickAction{
			{Type: "report_conditions", Label: "Report conditions"},
			{Type: "explore_spots", Label: "Open spots"},
			{Type: "find_buddy", Label: "Find buddy"},
			{Type: "join_event", Label: "See meetups"},
		}
	default:
		return []QuickAction{
			{Type: "post_update", Label: "Post update"},
			{Type: "find_buddy", Label: "Find buddy"},
			{Type: "open_chika", Label: "Open chika"},
			{Type: "create_session", Label: "Create session"},
		}
	}
}
