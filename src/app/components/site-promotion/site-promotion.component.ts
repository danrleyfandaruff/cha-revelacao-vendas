import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EVENT_TYPES } from '../../models/event-types';
import { AnalyticsService } from '../../services/analytics.service';

@Component({
  selector: 'app-site-promotion',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './site-promotion.component.html',
  styleUrls: ['./site-promotion.component.scss'],
})
export class SitePromotionComponent {
  @Input() compact = false;
  @Input() eventEnded = false;
  @Input() placement = 'public_page';
  readonly occasions = EVENT_TYPES;

  constructor(private analytics: AnalyticsService) {}

  track(action: 'learn' | 'create' | 'manage') {
    this.analytics.sitePromotionClick(this.placement, action);
  }
}
